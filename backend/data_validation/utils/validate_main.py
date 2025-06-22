import os
import sys
import json
import pandas as pd
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, concat_ws, hash, struct, when, isnan, isnull, coalesce, lit
from pyspark.sql.types import StringType
from datetime import datetime
import time

class AdvancedValidator:
    def __init__(self, spark):
        self.spark = spark
        self.start_time = datetime.now()

    def get_primary_keys_from_config(self, config_file, table_name):
        """Extract primary keys for a table from config.csv"""
        try:
            df = pd.read_csv(config_file)
            for _, row in df.iterrows():
                if row['table'] == table_name:
                    try:
                        keys_value = str(row['Keys'])
                        if keys_value and keys_value != 'nan':
                            return [k.strip() for k in keys_value.split(',') if k.strip()]
                    except (ValueError, TypeError):
                        pass
                    return []
            return []
        except Exception as e:
            print(f"Error reading keys from config: {str(e)}")
            return []

    def load_table_data(self, connection_info, table_name, limit_rows=None):
        """Load table data using Spark JDBC"""
        try:
            start_time = time.time()
            
            df_builder = self.spark.read \
                .format("jdbc") \
                .option("url", connection_info['url']) \
                .option("dbtable", table_name) \
                .option("user", connection_info['user']) \
                .option("password", connection_info['password']) \
                .option("driver", connection_info['driver'])
            
            df = df_builder.load()
            
            # Apply limit if specified
            if limit_rows:
                df = df.limit(limit_rows)
            
            row_count = df.count()
            end_time = time.time()
            
            return {
                "dataframe": df,
                "row_count": row_count,
                "time_taken": end_time - start_time
            }
        except Exception as e:
            print(f"Error loading table {table_name}: {str(e)}")
            return None

    def create_row_hash(self, df, exclude_columns=None):
        """Create a hash for each row to enable comparison"""
        exclude_columns = exclude_columns or []
        
        # Get all columns except excluded ones
        compare_columns = [c for c in df.columns if c not in exclude_columns]
        
        # Convert all columns to string and handle nulls
        string_columns = []
        for col_name in compare_columns:
            string_col = coalesce(col(col_name).cast(StringType()), lit("NULL"))
            string_columns.append(string_col)
        
        # Create concatenated string of all column values
        concat_expr = concat_ws("|", *string_columns)
        
        # Add row hash column
        df_with_hash = df.withColumn("row_hash", hash(concat_expr))
        
        return df_with_hash

    def calculate_table_checksum(self, df, table_name):
        """Calculate checksum for the entire table"""
        try:
            start_time = time.time()
            
            # Create row hash for all rows
            df_with_hash = self.create_row_hash(df, exclude_columns=[])
            
            # Calculate overall table checksum
            checksum_result = df_with_hash.agg({"row_hash": "sum"}).collect()[0][0]
            
            end_time = time.time()
            elapsed_time = end_time - start_time
            
            return {
                "checksum": str(checksum_result) if checksum_result else "0",
                "start_time": datetime.fromtimestamp(start_time).strftime("%Y-%m-%d-%H.%M.%S"),
                "end_time": datetime.fromtimestamp(end_time).strftime("%Y-%m-%d-%H.%M.%S"),
                "total_time": f"0:00:{elapsed_time:08.6f}"
            }
        except Exception as e:
            print(f"Error calculating checksum for {table_name}: {str(e)}")
            return {
                "checksum": "ERROR",
                "start_time": "",
                "end_time": "",
                "total_time": "0:00:00.000000"
            }

    def find_row_differences(self, source_df, target_df, primary_keys, table_name):
        """Find actual rows that differ between source and target - ENHANCED FOR DETAILED REPORTING"""
        
        # Create hashes for comparison
        source_with_hash = self.create_row_hash(source_df, exclude_columns=[])
        target_with_hash = self.create_row_hash(target_df, exclude_columns=[])
        
        # Calculate total counts for differences
        total_source_not_in_target = 0
        total_target_not_in_source = 0
        total_field_mismatches = 0
        
        # If we have primary keys, use them for joins
        if primary_keys and all(key in source_df.columns and key in target_df.columns for key in primary_keys):
            print(f"Using primary keys for comparison: {primary_keys}")
            
            # Count total differences first
            source_not_in_target_full = source_with_hash.alias("s").join(
                target_with_hash.alias("t"), 
                primary_keys, 
                "left_anti"
            )
            total_source_not_in_target = source_not_in_target_full.count()
            
            target_not_in_source_full = target_with_hash.alias("t").join(
                source_with_hash.alias("s"), 
                primary_keys, 
                "left_anti"
            )
            total_target_not_in_source = target_not_in_source_full.count()
            
            # Get limited samples for display
            source_not_in_target = source_not_in_target_full.drop("row_hash").limit(10)
            target_not_in_source = target_not_in_source_full.drop("row_hash").limit(10)
            
            # Find rows with same primary key but different data
            joined_for_mismatch = source_with_hash.alias("s").join(
                target_with_hash.alias("t"), 
                primary_keys, 
                "inner"
            ).filter(col("s.row_hash") != col("t.row_hash"))
            
            total_field_mismatches = joined_for_mismatch.count()
            
            field_mismatches = []
            if total_field_mismatches > 0:
                # Get limited samples for field mismatches
                mismatch_sample = joined_for_mismatch.limit(10).collect()
                
                for row in mismatch_sample:
                    row_dict = row.asDict()
                    
                    # Get primary key identifier (usually EMPNO)
                    empno_key = None
                    empno_value = None
                    
                    for pk in primary_keys:
                        if 'empno' in pk.lower() or 'id' in pk.lower():
                            empno_key = pk
                            empno_value = row_dict.get(f"s.{pk}")
                            break
                    
                    if not empno_key:
                        empno_key = primary_keys[0]
                        empno_value = row_dict.get(f"s.{empno_key}")
                    
                    mismatch_details = {
                        empno_key: empno_value,
                        "mismatches": []
                    }
                    
                    # Compare all columns to find specific field differences
                    for col_name in source_df.columns:
                        if col_name not in primary_keys and col_name != "row_hash":
                            source_val = row_dict.get(f"s.{col_name}")
                            target_val = row_dict.get(f"t.{col_name}")
                            
                            if source_val != target_val:
                                mismatch_details["mismatches"].append({
                                    "field": col_name,
                                    "source_value": source_val,
                                    "target_value": target_val
                                })
                    
                    if mismatch_details["mismatches"]:
                        field_mismatches.append(mismatch_details)
        
        else:
            print("No primary keys available - using hash-based comparison")
            # Fallback: use row hash comparison when no primary keys
            source_hashes = source_with_hash.select("row_hash").distinct()
            target_hashes = target_with_hash.select("row_hash").distinct()
            
            # Count totals
            source_not_in_target_full = source_with_hash.join(
                target_hashes, 
                source_with_hash.row_hash == target_hashes.row_hash, 
                "left_anti"
            )
            total_source_not_in_target = source_not_in_target_full.count()
            
            target_not_in_source_full = target_with_hash.join(
                source_hashes, 
                target_with_hash.row_hash == source_hashes.row_hash, 
                "left_anti"
            )
            total_target_not_in_source = target_not_in_source_full.count()
            
            # Get samples
            source_not_in_target = source_not_in_target_full.drop("row_hash").limit(10)
            target_not_in_source = target_not_in_source_full.drop("row_hash").limit(10)
            
            field_mismatches = []  # Can't determine field-level mismatches without keys
            total_field_mismatches = 0
        
        # Convert to list of dictionaries for output
        source_diff_rows = [row.asDict() for row in source_not_in_target.collect()] if source_not_in_target else []
        target_diff_rows = [row.asDict() for row in target_not_in_source.collect()] if target_not_in_source else []
        
        return {
            "source_not_in_target": source_diff_rows,
            "target_not_in_source": target_diff_rows, 
            "field_mismatches": field_mismatches,
            "source_not_in_target_count": total_source_not_in_target,
            "target_not_in_source_count": total_target_not_in_source,
            "field_mismatches_count": total_field_mismatches,
            "showing_top_10_source": total_source_not_in_target > 10,
            "showing_top_10_target": total_target_not_in_source > 10,
            "showing_top_10_mismatches": total_field_mismatches > 10
        }

    def validate_tables(self, run_dir, config):
        """Main validation logic with detailed row comparison"""
        validation_results = {
            "tables": {},
            "summary": {
                "total_tables": 0,
                "tables_with_differences": 0,
                "start_time": self.start_time.isoformat(),
                "end_time": None
            }
        }
        
        validation_log = []
        
        # Read config.csv to get table list
        config_csv = os.path.join(run_dir, "config.csv")
        if not os.path.exists(config_csv):
            print("Error: config.csv not found")
            return validation_results
        
        try:
            df_config = pd.read_csv(config_csv)
            
            # Get unique tables and pair them properly - FIXED FOR CROSS-DATABASE COMPARISON
            all_tables = df_config['table'].unique().tolist()
            
            # Separate source and target tables for cross-database comparison
            source_tables = []
            target_tables = []
            table_pairs = []
            
            # Check if we have comparison_pair and role columns for proper pairing
            has_pairing_info = 'comparison_pair' in df_config.columns and 'role' in df_config.columns
            
            if has_pairing_info:
                print("✅ Using explicit table pairing information")
                                 # Group by comparison_pair to create proper source-target pairs
                unique_pairs = df_config['comparison_pair'].unique()
                for pair_name in unique_pairs:
                    if pd.isna(pair_name):
                        continue
                        
                    pair_mask = df_config['comparison_pair'] == pair_name
                    pair_data = df_config[pair_mask]
                    
                    # Find source and target entries
                    source_table = None
                    target_table = None
                    
                    for idx, row in pair_data.iterrows():
                        if row['role'] == 'source':
                            source_table = row['table']
                        elif row['role'] == 'target':
                            target_table = row['table']
                    
                    if source_table and target_table:
                        table_pairs.append((source_table, target_table))
                        print(f"   Paired: {source_table} ↔ {target_table}")
                    else:
                        print(f"⚠️  Incomplete pair for {pair_name}")
            else:
                print("⚠️  No pairing info found - trying legacy mode")
                # Legacy fallback: try to pair source and target schemas
                for table in all_tables:
                    if 'SOURCE_SCHEMA' in table or 'source' in table.lower():
                        source_tables.append(table)
                    elif 'TARGET_SCHEMA' in table or 'target' in table.lower():
                        target_tables.append(table)
                
                # Try to match source and target tables by table name
                for src_table in source_tables:
                    # Extract table name without schema
                    src_table_name = src_table.split('.')[-1] if '.' in src_table else src_table
                    
                    # Find corresponding target table
                    for tgt_table in target_tables:
                        tgt_table_name = tgt_table.split('.')[-1] if '.' in tgt_table else tgt_table
                        
                        if src_table_name == tgt_table_name:
                            table_pairs.append((src_table, tgt_table))
                            print(f"   Legacy paired: {src_table} ↔ {tgt_table}")
                            break
            
            validation_results["summary"]["total_tables"] = len(table_pairs)
            print(f"Processing {len(table_pairs)} table pairs")
            
        except Exception as e:
            print(f"Error reading config: {str(e)}")
            return validation_results

        # Process each table pair
        for i, (src_table, tgt_table) in enumerate(table_pairs):
            print(f"\n=== Validating table pair {i+1}: {src_table} -> {tgt_table} ===")
            validation_log.append(f"\nTable: {src_table}")
            
            table_result = {
                "source_table": src_table,
                "target_table": tgt_table,
                "source_rows": 0,
                "target_rows": 0,
                "source_time": 0,
                "target_time": 0,
                "differences": {}
            }
            
            # Get primary keys for this table - try from config first, then fallback
            primary_keys = self.get_primary_keys_from_config(config_csv, src_table)
            
            # If no keys in config, try to use common default keys
            if not primary_keys:
                # Check if table has common primary key column names
                try:
                    source_data_temp = self.load_table_data(config['source_connection'], src_table, limit_rows=1)
                    if source_data_temp and source_data_temp["dataframe"]:
                        columns = source_data_temp["dataframe"].columns
                        # Look for common primary key patterns
                        for col in columns:
                            col_lower = col.lower()
                            if any(pattern in col_lower for pattern in ['empno', 'id', 'key', 'pk', 'num']):
                                primary_keys = [col]
                                break
                        
                        # If still no keys found, use first column as fallback
                        if not primary_keys and columns:
                            primary_keys = [columns[0]]
                except:
                    primary_keys = []
            
            print(f"Primary keys for {src_table}: {primary_keys}")
            
            # Load source data
            print(f"Loading source table: {src_table}")
            source_data = self.load_table_data(config['source_connection'], src_table, limit_rows=1000)
            if source_data:
                table_result["source_rows"] = source_data["row_count"]
                table_result["source_time"] = source_data["time_taken"]
                validation_log.extend([
                    f"Source Rows: {source_data['row_count']}",
                    f"Source Time: {source_data['time_taken']:.2f}s"
                ])
                print(f"Source loaded: {source_data['row_count']} rows")
            else:
                print("Source: Failed to load")
                validation_log.append("Source: Failed to load")
                continue
            
            # Load target data
            print(f"Loading target table: {tgt_table}")
            target_data = self.load_table_data(config['target_connection'], tgt_table, limit_rows=1000)
            if target_data:
                table_result["target_rows"] = target_data["row_count"]
                table_result["target_time"] = target_data["time_taken"]
                validation_log.extend([
                    f"Target Rows: {target_data['row_count']}",
                    f"Target Time: {target_data['time_taken']:.2f}s"
                ])
                print(f"Target loaded: {target_data['row_count']} rows")
            else:
                print("Target: Failed to load")
                validation_log.append("Target: Failed to load")
                continue
            
            # Calculate checksums
            print("Calculating checksums...")
            source_checksum = self.calculate_table_checksum(source_data["dataframe"], src_table)
            target_checksum = self.calculate_table_checksum(target_data["dataframe"], tgt_table)
            
            table_result["source_checksum"] = source_checksum
            table_result["target_checksum"] = target_checksum
            table_result["checksum_match"] = source_checksum["checksum"] == target_checksum["checksum"]
            
            # Find detailed differences
            print("Finding row differences...")
            try:
                differences = self.find_row_differences(
                    source_data["dataframe"], 
                    target_data["dataframe"], 
                    primary_keys,
                    src_table
                )
                
                table_result["differences"] = differences
                
                # Log summary counts
                validation_log.extend([
                    f"Rows in Source not in Target: {differences['source_not_in_target_count']}",
                    f"Rows in Target not in Source: {differences['target_not_in_source_count']}",
                    f"Field Mismatches: {differences['field_mismatches_count']}"
                ])
                
                print(f"Differences found - Source not in Target: {differences['source_not_in_target_count']}, Target not in Source: {differences['target_not_in_source_count']}, Field Mismatches: {differences['field_mismatches_count']}")
                
                # Track tables with differences
                if (differences['source_not_in_target_count'] > 0 or 
                    differences['target_not_in_source_count'] > 0 or 
                    differences['field_mismatches_count'] > 0):
                    validation_results["summary"]["tables_with_differences"] += 1
                
            except Exception as e:
                print(f"Error finding differences: {str(e)}")
                import traceback
                traceback.print_exc()
                table_result["differences"] = {
                    "source_not_in_target": [],
                    "target_not_in_source": [],
                    "field_mismatches": [],
                    "source_not_in_target_count": 0,
                    "target_not_in_source_count": 0,
                    "field_mismatches_count": 0
                }
            
            validation_results["tables"][src_table] = table_result
        
        # Finalize results
        validation_results["summary"]["end_time"] = datetime.now().isoformat()
        
        print(f"Validation complete - processed {len(validation_results['tables'])} tables")
        
        # Save detailed results to JSON
        results_file = os.path.join(run_dir, "detailed_validation_results.json")
        with open(results_file, 'w') as f:
            json.dump(validation_results, f, indent=2, default=str)
        
        # Generate formatted report in the user's exact requested format
        formatted_report = self.generate_formatted_report(validation_results, df_config)
        
        # Save traditional log format for compatibility
        validation_log_file = os.path.join(run_dir, "logs", "validation.log")
        with open(validation_log_file, 'w') as f:
            f.write('\n'.join(validation_log))
        
        # Save formatted report
        formatted_report_file = os.path.join(run_dir, "logs", "formatted_validation_report.txt")
        with open(formatted_report_file, 'w') as f:
            f.write(formatted_report)
        
        print(f"Results saved to {results_file}")
        print(f"Formatted report saved to {formatted_report_file}")
        
        return validation_results

    def generate_formatted_report(self, validation_results, df_config):
        """Generate formatted report in the exact format requested by user"""
        
        report_lines = []
        
        # Process each table
        for table_name, table_data in validation_results["tables"].items():
            
            # Get group by info from config
            group_by_info = ""
            try:
                table_config = df_config[df_config['table'] == table_data['source_table']]
                if not table_config.empty:
                    groupby_fields = table_config.iloc[0].get('groupby_fields', '')
                    if groupby_fields and groupby_fields != 'nan' and str(groupby_fields).strip():
                        group_by_info = f"Group by: {groupby_fields}"
            except:
                pass
            
            # Checksum information
            source_checksum = table_data.get("source_checksum", {})
            target_checksum = table_data.get("target_checksum", {})
            
            report_lines.extend([
                f"{table_data.get('source_table', table_name)}",
                f"Source Checksum Total Time: {source_checksum.get('total_time', '0:00:00.000000')} Start Time: {source_checksum.get('start_time', '')} End Time: {source_checksum.get('end_time', '')}",
                f"Target Checksum Total Time: {target_checksum.get('total_time', '0:00:00.000000')} Start Time: {target_checksum.get('start_time', '')} End Time: {target_checksum.get('end_time', '')}",
            ])
            
            # Checksum mismatch information
            if not table_data.get("checksum_match", True):
                report_lines.extend([
                    f"❌ {table_data.get('source_table', table_name)}: Checksum mismatch",
                    f"Source: {source_checksum.get('checksum', 'ERROR')}",
                    f"Target: {target_checksum.get('checksum', 'ERROR')}",
                ])
            
            report_lines.extend([
                "",
                "################################# Report for table " + table_data.get('source_table', table_name) + " #################################",
                ""
            ])
            
            # Group by information
            if group_by_info:
                report_lines.extend([
                    group_by_info,
                    ""
                ])
            
            differences = table_data.get("differences", {})
            
            # Source rows not in target
            report_lines.append("Source rows not in Target :")
            source_not_in_target = differences.get("source_not_in_target", [])
            source_count = differences.get("source_not_in_target_count", 0)
            
            if source_not_in_target:
                # Create header with column names
                if len(source_not_in_target) > 0:
                    columns = list(source_not_in_target[0].keys())
                    # Create header row
                    header = "|" + "|".join([f"{col:>12}" for col in columns]) + "|"
                    separator = "+" + "+".join(["-" * 12 for _ in columns]) + "+"
                    
                    report_lines.extend([
                        separator,
                        header,
                        separator
                    ])
                    
                    # Add data rows
                    for row in source_not_in_target:
                        row_data = "|" + "|".join([f"{str(row.get(col, '')):>12}" for col in columns]) + "|"
                        report_lines.append(row_data)
                    
                    report_lines.append(separator)
                
                if differences.get("showing_top_10_source", False):
                    report_lines.append(f"(Displaying only top 10 rows out of {source_count} total)")
            else:
                report_lines.append("No rows found in source that are missing in target.")
            
            report_lines.append("")
            
            # Target rows not in source
            report_lines.append("Target rows not in Source :")
            target_not_in_source = differences.get("target_not_in_source", [])
            target_count = differences.get("target_not_in_source_count", 0)
            
            if target_not_in_source:
                # Create header with column names
                if len(target_not_in_source) > 0:
                    columns = list(target_not_in_source[0].keys())
                    # Create header row
                    header = "|" + "|".join([f"{col:>12}" for col in columns]) + "|"
                    separator = "+" + "+".join(["-" * 12 for _ in columns]) + "+"
                    
                    report_lines.extend([
                        separator,
                        header,
                        separator
                    ])
                    
                    # Add data rows
                    for row in target_not_in_source:
                        row_data = "|" + "|".join([f"{str(row.get(col, '')):>12}" for col in columns]) + "|"
                        report_lines.append(row_data)
                    
                    report_lines.append(separator)
                
                if differences.get("showing_top_10_target", False):
                    report_lines.append(f"(Displaying only top 10 rows out of {target_count} total)")
            else:
                report_lines.append("No rows found in target that are missing in source.")
            
            report_lines.append("")
            
            # Rows with fields not matching source vs target
            report_lines.append("Rows with fields not matching Source vs Target :")
            field_mismatches = differences.get("field_mismatches", [])
            field_mismatch_count = differences.get("field_mismatches_count", 0)
            
            if field_mismatches:
                for mismatch in field_mismatches:
                    # Get EMPNO or primary key
                    empno_key = None
                    empno_value = None
                    
                    for key, value in mismatch.items():
                        if key != "mismatches":
                            empno_key = key
                            empno_value = value
                            break
                    
                    report_lines.append(f"EMPNO: {empno_value} | Source vs Target Field Values")
                    
                    # Show mismatched fields
                    for mismatch_detail in mismatch.get("mismatches", []):
                        field_name = mismatch_detail.get("field", "")
                        source_val = mismatch_detail.get("source_value", "")
                        target_val = mismatch_detail.get("target_value", "")
                        
                        report_lines.append(f"  {field_name} -> [source: \"{source_val}\", target: \"{target_val}\"]")
                
                if differences.get("showing_top_10_mismatches", False):
                    report_lines.append(f"(Displaying only top 10 rows out of {field_mismatch_count} total)")
            else:
                report_lines.append("No field mismatches found.")
            
            report_lines.extend([
                "",
                "################################# Tables and Counts #################################",
                ""
            ])
            
            # Summary table
            table_summary = f"""
+{'-'*45}+{'-'*12}+{'-'*12}+{'-'*19}+{'-'*19}+{'-'*16}+
|{'Table':^45}|{'SourceRows':^12}|{'TargetRows':^12}|{'Source diff Target':^19}|{'Target diff Source':^19}|{'Fields mismatch':^16}|
+{'-'*45}+{'-'*12}+{'-'*12}+{'-'*19}+{'-'*19}+{'-'*16}+
|{table_data.get('source_table', table_name):^45}|{table_data.get('source_rows', 0):^12}|{table_data.get('target_rows', 0):^12}|{differences.get('source_not_in_target_count', 0):^19}|{differences.get('target_not_in_source_count', 0):^19}|{differences.get('field_mismatches_count', 0):^16}|
+{'-'*45}+{'-'*12}+{'-'*12}+{'-'*19}+{'-'*19}+{'-'*16}+
"""
            
            report_lines.append(table_summary.strip())
            report_lines.extend(["", "="*120, ""])
        
        return "\n".join(report_lines)

def main():
    if len(sys.argv) < 2:
        print("Usage: python validate_main.py <run_directory>")
        sys.exit(1)

    run_dir = sys.argv[1]
    config_file = os.path.join(run_dir, "config.json")

    # Initialize Spark
    spark = SparkSession.builder \
        .appName("Advanced Data Validation") \
        .config("spark.driver.extraClassPath", "jars/terajdbc4.jar:jars/db2jcc4.jar") \
        .config("spark.sql.adaptive.enabled", "false") \
        .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
        .getOrCreate()

    try:
        # Load configuration
        with open(config_file) as f:
            config = json.load(f)

        # Initialize validator
        validator = AdvancedValidator(spark)

        # Run validation
        print("Starting advanced validation...")
        results = validator.validate_tables(run_dir, config)

        print(f"✅ Validation complete. Detailed results saved to {run_dir}")
        print(f"Tables processed: {results['summary']['total_tables']}")
        print(f"Tables with differences: {results['summary']['tables_with_differences']}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        spark.stop()

if __name__ == "__main__":
    main()