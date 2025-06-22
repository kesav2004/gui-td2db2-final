# routes.py
from flask import Blueprint, request, jsonify, send_file
import os
import subprocess
import csv
import uuid
import pathlib
from datetime import datetime
from .utils import generate_csv_from_request
from .services import (
    validate_teradata_connection, validate_db2_connection,
    fetch_db2_schemas, fetch_db2_tables, fetch_db2_columns,
    fetch_teradata_schemas, fetch_teradata_tables, fetch_teradata_columns, generate_ddl_statement
)
import logging
import gzip
import json

bp = Blueprint('data_validation', __name__, url_prefix='/api')

@bp.route('/validate', methods=['POST'])
def validate_connection():
    data = request.get_json()
    try:
        if data['db_type'] == 'teradata':
            return jsonify(success=validate_teradata_connection(data))
        elif data['db_type'] == 'db2':
            return jsonify(success=validate_db2_connection(data))
        else:
            return jsonify(success=False, message="Unsupported DB type"), 400
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

@bp.route('/schemas', methods=['POST'])
def get_schemas():
    data = request.get_json()
    try:
        if data['db_type'] == 'db2':
            return jsonify(schemas=fetch_db2_schemas(data))
        elif data['db_type'] == 'teradata':
            return jsonify(schemas=fetch_teradata_schemas(data))
        else:
            return jsonify(message="Unsupported database type"), 400
    except Exception as e:
        return jsonify(message=str(e)), 500

@bp.route('/tables', methods=['POST'])
def get_tables():
    data = request.get_json()
    if not data.get('schema'):
        return jsonify(message="Missing schema name"), 400
    try:
        if data['db_type'] == 'db2':
            return jsonify(tables=fetch_db2_tables(data))
        elif data['db_type'] == 'teradata':
            return jsonify(tables=fetch_teradata_tables(data))
        else:
            return jsonify(message="Unsupported database type"), 400
    except Exception as e:
        return jsonify(message=str(e)), 500

@bp.route('/columns', methods=['POST'])
def get_columns():
    data = request.get_json()
    if not data.get('schema') or not data.get('table'):
        return jsonify(message="Missing schema or table name"), 400
    try:
        if data['db_type'] == 'db2':
            return jsonify(columns=fetch_db2_columns(data))
        elif data['db_type'] == 'teradata':
            return jsonify(columns=fetch_teradata_columns(data))
        else:
            return jsonify(message="Unsupported database type"), 400
    except Exception as e:
        return jsonify(message=str(e)), 500

def generate_config_json(run_path, data):
    """Generate config.json file with database connection information"""
    config = {
        "source_connection": {
            "url": f"jdbc:{data['source_db']['db_type']}://{data['source_db']['host']}:{data['source_db']['port']}/{data['source_db']['database']}",
            "user": data['source_db']['username'],
            "password": data['source_db']['password'],
            "driver": "com.ibm.db2.jcc.DB2Driver" if data['source_db']['db_type'] == 'db2' else "com.teradata.jdbc.TeraDriver"
        },
        "target_connection": {
            "url": f"jdbc:{data['target_db']['db_type']}://{data['target_db']['host']}:{data['target_db']['port']}/{data['target_db']['database']}",
            "user": data['target_db']['username'],
            "password": data['target_db']['password'],
            "driver": "com.ibm.db2.jcc.DB2Driver" if data['target_db']['db_type'] == 'db2' else "com.teradata.jdbc.TeraDriver"
        },
        "source_tables": [f"{data['sourceSchema']}.{data['sourceTable']}"] if data.get("comparisonType") != "full" else [],
        "target_tables": [f"{data['targetSchema']}.{data['targetTable']}"] if data.get("comparisonType") != "full" else []
    }
    
    config_file = os.path.join(run_path, "config.json")
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    return config_file

@bp.route('/run-validation', methods=['POST'])
def run_validation():
    try:
        print("Starting validation process...")
        data = request.get_json()
        if not data:
            print("Error: No data provided in request")
            return jsonify(success=False, message="No data provided in request"), 400

        print(f"Received data: {data}")

        # Validate required fields
        required_fields = ['sourceSchema', 'targetSchema', 'keys']
        if data.get("comparisonType") != "full" and 'sourceTable' not in data:
            required_fields.append('sourceTable')
            required_fields.append('targetTable')
        
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            print(f"Error: Missing required fields: {missing_fields}")
            return jsonify(success=False, message=f"Missing required fields: {', '.join(missing_fields)}"), 400

        # Create run directory
        run_id = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        run_path = os.path.join("runs", run_id)
        log_dir = os.path.join(run_path, "logs")
        os.makedirs(log_dir, exist_ok=True)
        print(f"Created run directory: {run_path}")

        # Setup logging
        log_file = os.path.join(log_dir, "validation.log")
        logging.basicConfig(
            filename=log_file,
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        print(f"Set up logging to: {log_file}")

        csv_file = os.path.join(run_path, "config.csv")
        ddl_file = os.path.join("ddl", "ddl.sql")

        # Generate DDL for both source and target tables
        source_ddl_data = {
            'db_type': data.get('source_db', {}).get('db_type'),
            'schema': data['sourceSchema'],
            'table': data['sourceTable'] if data.get("comparisonType") != "full" else None,
            'host': data.get('source_db', {}).get('host'),
            'port': data.get('source_db', {}).get('port'),
            'database': data.get('source_db', {}).get('database'),
            'username': data.get('source_db', {}).get('username'),
            'password': data.get('source_db', {}).get('password'),
            'include_fields': ','.join(data['includeColumns']) if data.get('includeColumns') else '',
            'exclude_fields': ','.join(data['excludeColumns']) if data.get('excludeColumns') else ''
        }

        target_ddl_data = {
            'db_type': data.get('target_db', {}).get('db_type'),
            'schema': data['targetSchema'],
            'table': data['targetTable'] if data.get("comparisonType") != "full" else None,
            'host': data.get('target_db', {}).get('host'),
            'port': data.get('target_db', {}).get('port'),
            'database': data.get('target_db', {}).get('database'),
            'username': data.get('target_db', {}).get('username'),
            'password': data.get('target_db', {}).get('password'),
            'include_fields': ','.join(data['includeColumns']) if data.get('includeColumns') else '',
            'exclude_fields': ','.join(data['excludeColumns']) if data.get('excludeColumns') else ''
        }

        # Generate DDL for both tables
        try:
            print("Generating DDL statements...")
            # Create ddl directory if it doesn't exist
            os.makedirs("backend/ddl", exist_ok=True)
            
            source_ddl = generate_ddl_statement(source_ddl_data) if data.get("comparisonType") != "full" else None
            target_ddl = generate_ddl_statement(target_ddl_data) if data.get("comparisonType") != "full" else None
            
            # Save combined DDL
            ddl_file = os.path.join("backend/ddl", "ddl.sql")
            print(f"Writing DDL to {ddl_file}")
            with open(ddl_file, "w") as f:
                if source_ddl:
                    print("Source DDL:", source_ddl)
                    f.write(source_ddl + "\n")
                if target_ddl:
                    print("Target DDL:", target_ddl)
                    f.write(target_ddl)
            
            if not os.path.exists(ddl_file):
                print(f"Error: DDL file was not created at {ddl_file}")
                return jsonify(success=False, message="Failed to create DDL file"), 500
                
            print(f"DDL file created successfully at {ddl_file}")
        except Exception as e:
            print(f"Error generating DDL: {str(e)}")
            return jsonify(success=False, message=f"Error generating DDL: {str(e)}"), 500

        # Prepare table rows for validation - FIXED FOR PROPER CROSS-DATABASE COMPARISON
        try:
            print("Preparing table configuration for cross-database comparison...")
            if data.get("comparisonType") == "full":
                print("Processing full schema comparison")
                
                # For full schema, use the matched table pairs from schema discovery
                if 'matched_tables' in data and data['matched_tables']:
                    print(f"Using {len(data['matched_tables'])} pre-matched table pairs")
                    table_rows = []
                    
                    # Create PAIRED table entries for proper cross-database comparison
                    for table_match in data['matched_tables']:
                        source_table_name = table_match['source_table']
                        target_table_name = table_match['target_table']
                        primary_keys = table_match.get('primary_keys', data.get('defaultKeys', []))
                        
                        # Create a single comparison pair instead of separate entries
                        comparison_name = f"{source_table_name}_vs_{target_table_name}"
                        
                        # First entry: source table
                        table_rows.append({
                            "table": f"{data['sourceSchema']}.{source_table_name}",
                            "comparison_pair": comparison_name,
                            "role": "source",
                            "target_table": f"{data['targetSchema']}.{target_table_name}",
                            "Keys": ','.join(primary_keys) if primary_keys else '',
                            "predicate": data.get("defaultPredicate", ""),
                            "exclude_fields": ','.join(data.get("defaultExcludeFields", [])) if data.get("defaultExcludeFields") else "",
                            "include_fields": ','.join(data.get("defaultIncludeFields", [])) if data.get("defaultIncludeFields") else "",
                            "groupby_fields": ','.join(data.get("defaultGroupBy", [])) if data.get("defaultGroupBy") else "",
                        })
                        
                        # Second entry: target table
                        table_rows.append({
                            "table": f"{data['targetSchema']}.{target_table_name}",
                            "comparison_pair": comparison_name,
                            "role": "target", 
                            "source_table": f"{data['sourceSchema']}.{source_table_name}",
                            "Keys": ','.join(primary_keys) if primary_keys else '',
                            "predicate": data.get("defaultPredicate", ""),
                            "exclude_fields": ','.join(data.get("defaultExcludeFields", [])) if data.get("defaultExcludeFields") else "",
                            "include_fields": ','.join(data.get("defaultIncludeFields", [])) if data.get("defaultIncludeFields") else "",
                            "groupby_fields": ','.join(data.get("defaultGroupBy", [])) if data.get("defaultGroupBy") else "",
                        })
                else:
                    # Fallback: auto-discover and match tables
                    print("Auto-discovering tables for full schema comparison")
                    source_tables = fetch_db2_tables(source_ddl_data) if source_ddl_data['db_type'] == 'db2' else fetch_teradata_tables(source_ddl_data)
                    target_tables = fetch_db2_tables(target_ddl_data) if target_ddl_data['db_type'] == 'db2' else fetch_teradata_tables(target_ddl_data)
                    
                    if not source_tables or not target_tables:
                        print("Error: No tables found for validation")
                        return jsonify(success=False, message="No tables found for validation"), 404
                    
                    # Auto-match tables by name and create proper pairs
                    table_rows = []
                    default_keys = data.get('defaultKeys', data.get('keys', []))
                    
                    for source_table in source_tables:
                        # Find matching target table
                        target_table = None
                        if source_table in target_tables:
                            target_table = source_table
                        else:
                            # Try case-insensitive match
                            for tgt in target_tables:
                                if source_table.lower() == tgt.lower():
                                    target_table = tgt
                                    break
                        
                        if target_table:
                            comparison_name = f"{source_table}_vs_{target_table}"
                            
                            # Source table entry
                            table_rows.append({
                                "table": f"{data['sourceSchema']}.{source_table}",
                                "comparison_pair": comparison_name,
                                "role": "source",
                                "target_table": f"{data['targetSchema']}.{target_table}",
                                "Keys": ','.join(default_keys) if default_keys else '',
                                "predicate": data.get("defaultPredicate", ""),
                                "exclude_fields": "",
                                "include_fields": "",
                                "groupby_fields": ','.join(data.get("defaultGroupBy", [])) if data.get("defaultGroupBy") else "",
                            })
                            
                            # Target table entry
                            table_rows.append({
                                "table": f"{data['targetSchema']}.{target_table}",
                                "comparison_pair": comparison_name,
                                "role": "target",
                                "source_table": f"{data['sourceSchema']}.{source_table}",
                                "Keys": ','.join(default_keys) if default_keys else '',
                                "predicate": data.get("defaultPredicate", ""),
                                "exclude_fields": "",
                                "include_fields": "",
                                "groupby_fields": ','.join(data.get("defaultGroupBy", [])) if data.get("defaultGroupBy") else "",
                            })
            else:
                print("Setting up single table comparison")
                comparison_name = f"{data['sourceTable']}_vs_{data['targetTable']}"
                
                # Create properly paired single table comparison
                table_rows = [
                    {
                        "table": f"{data['sourceSchema']}.{data['sourceTable']}",
                        "comparison_pair": comparison_name,
                        "role": "source",
                        "target_table": f"{data['targetSchema']}.{data['targetTable']}",
                        "Keys": ','.join(data['keys']),
                        "predicate": data.get("predicate", ""),
                        "exclude_fields": ','.join(data['excludeColumns']) if data.get('excludeColumns') else "",
                        "include_fields": ','.join(data['includeColumns']) if data.get('includeColumns') else "",
                        "groupby_fields": ','.join(data.get("groupby", [])),
                    },
                    {
                        "table": f"{data['targetSchema']}.{data['targetTable']}",
                        "comparison_pair": comparison_name,
                        "role": "target",
                        "source_table": f"{data['sourceSchema']}.{data['sourceTable']}",
                        "Keys": ','.join(data['keys']),
                        "predicate": data.get("predicate", ""),
                        "exclude_fields": ','.join(data['excludeColumns']) if data.get('excludeColumns') else "",
                        "include_fields": ','.join(data['includeColumns']) if data.get('includeColumns') else "",
                        "groupby_fields": ','.join(data.get("groupby", [])),
                    }
                ]
            
            print(f"✅ FIXED: Table configuration prepared with {len(table_rows)//2} comparison pairs")
            for i in range(0, len(table_rows), 2):
                if i+1 < len(table_rows):
                    print(f"   Pair {i//2 + 1}: {table_rows[i]['table']} ↔ {table_rows[i]['target_table']}")
            
        except Exception as e:
            print(f"Error preparing table configuration: {str(e)}")
            return jsonify(success=False, message=f"Error preparing table configuration: {str(e)}"), 500

        # Create run directory and write config
        try:
            print("Creating run directory and config...")
            os.makedirs(run_path, exist_ok=True)
            os.makedirs(log_dir, exist_ok=True)
            
            csv_file = os.path.join(run_path, "config.csv")
            print(f"Writing configuration to {csv_file}")
            with open(csv_file, 'w', newline='') as f:
                # Updated fieldnames to include new cross-comparison fields
                writer = csv.DictWriter(f, fieldnames=[
                    "table", "Keys", "predicate", "exclude_fields", "include_fields", "groupby_fields",
                    "comparison_pair", "role", "target_table", "source_table"
                ])
                writer.writeheader()
                for row in table_rows:
                    # Only write the fields that exist in the row to avoid KeyError
                    filtered_row = {k: v for k, v in row.items() if k in writer.fieldnames}
                    writer.writerow(filtered_row)
            
            if not os.path.exists(csv_file):
                print(f"Error: Config CSV was not created at {csv_file}")
                return jsonify(success=False, message="Failed to create config CSV"), 500
                
            print(f"Config CSV created successfully at {csv_file}")
        except Exception as e:
            print(f"Error creating run configuration: {str(e)}")
            return jsonify(success=False, message=f"Error creating run configuration: {str(e)}"), 500

        # Generate both config.json and config.csv
        config_json = generate_config_json(run_path, data)

        # Run schema script
        try:
            print("Running schema script...")
            # Get absolute paths for everything
            current_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            script_path = os.path.join(current_dir, "backend/data_validation/utils/create_schema_updated.py")
            csv_file_path = os.path.abspath(os.path.join(run_path, "config.csv"))
            ddl_file_path = os.path.abspath(ddl_file)
            
            print(f"Current directory: {current_dir}")
            print(f"Script path: {script_path}")
            print(f"CSV file path: {csv_file_path}")
            print(f"DDL file path: {ddl_file_path}")
            print(f"Working directory: {run_path}")

            # Verify all required files and directories exist
            if not os.path.exists(script_path):
                print(f"Error: Schema script not found at {script_path}")
                return jsonify(success=False, message=f"Schema script not found at {script_path}"), 500

            # Create runs directory if it doesn't exist
            os.makedirs(run_path, exist_ok=True)

            # Verify the config.csv was created
            if not os.path.exists(csv_file_path):
                print(f"Error: Config CSV not found at {csv_file_path}")
                return jsonify(success=False, message=f"Config CSV not found at {csv_file_path}"), 500

            try:
                result = subprocess.run(
                    ["python3", script_path, "--csv", csv_file_path, "--ddl", ddl_file_path],
                    cwd=run_path,
                    capture_output=True,
                    text=True,
                    check=True
                )
                print("Schema script output:", result.stdout)
                if result.stderr:
                    print("Schema script warnings:", result.stderr)
            except subprocess.CalledProcessError as e:
                error_msg = f"Schema script failed with exit code {e.returncode}.\nOutput: {e.stdout}\nError: {e.stderr}"
                print(error_msg)
                return jsonify(success=False, message=error_msg), 500
        except Exception as e:
            print(f"Error in schema script execution: {str(e)}")
            return jsonify(success=False, message=f"Error in schema script execution: {str(e)}"), 500

        # Run validation script
        try:
            print("Running validation script...")
            validation_script = os.path.abspath("data_validation/utils/validate_main.sh")
            
            if not os.path.exists(validation_script):
                print(f"Error: Validation script not found at {validation_script}")
                return jsonify(success=False, message=f"Validation script not found at {validation_script}"), 500

            result = subprocess.run(
                ["sh", validation_script],
                cwd=run_path,
                capture_output=True,
                text=True,
                check=True
            )
            print("Validation script output:", result.stdout)
            if result.stderr:
                print("Validation script warnings:", result.stderr)
        except subprocess.CalledProcessError as e:
            print(f"Validation script failed: {str(e)}")
            print(f"Script output: {e.output if hasattr(e, 'output') else 'No output'}")
            return jsonify(success=False, message=f"Validation script failed: {str(e)}\nOutput: {e.output if hasattr(e, 'output') else 'No output'}"), 500

        # Find and parse log file
        try:
            print("Looking for validation log files...")
            log_files = [f for f in os.listdir(log_dir) if f.endswith((".log", ".log.gz"))]
            if not log_files:
                print(f"Error: No validation log files found in {log_dir}")
                return jsonify(success=False, message="No validation log files found"), 500

            log_file_path = os.path.join(log_dir, log_files[0])
            print(f"Processing log file: {log_file_path}")

            # Read log content
            try:
                if log_file_path.endswith('.gz'):
                    with gzip.open(log_file_path, 'rt') as f:
                        log_content = f.read()
                else:
                    with open(log_file_path, 'r') as f:
                        log_content = f.read()
                print("Log file read successfully")
            except Exception as e:
                print(f"Error reading log file: {str(e)}")
                return jsonify(success=False, message=f"Error reading log file: {str(e)}"), 500

            # Try to load detailed validation results first
            print("Loading detailed validation results...")
            detailed_results = load_detailed_validation_results(run_path)
            
            if detailed_results:
                print("Using detailed validation results...")
                formatted_results = {
                    'success': True,
                    'tables': [],
                    'summary': detailed_results.get('summary', {}),
                    'run_id': run_id,
                    'run_path': run_path
                }

                # Process each table's detailed results
                tables_data = detailed_results.get('tables') or {}
                for table_name, table_data in tables_data.items():
                    table_result = format_table_display_data(table_data)
                    
                    # Add enhanced display formatting
                    table_result['formattedSummary'] = format_table_summary(table_result)
                    
                    # Add indicators for differences
                    table_result['hasDifferences'] = (
                        table_result['rowsNotInTarget'] > 0 or 
                        table_result['rowsNotInSource'] > 0 or 
                        table_result['fieldsMismatch'] > 0
                    )
                    
                    # Add sample row previews for display
                    if table_result.get('sourceNotInTargetRows'):
                        table_result['sourceNotInTargetPreview'] = table_result['sourceNotInTargetRows'][:3]
                    
                    if table_result.get('targetNotInSourceRows'):
                        table_result['targetNotInSourcePreview'] = table_result['targetNotInSourceRows'][:3]
                    
                    if table_result.get('fieldMismatchRows'):
                        table_result['fieldMismatchPreview'] = table_result['fieldMismatchRows'][:3]

                    formatted_results['tables'].append(table_result)

                print(f"Detailed validation completed successfully - {len(formatted_results['tables'])} tables processed")
                return jsonify(formatted_results)
            
            else:
                # Fallback to parsing traditional log format
                print("No detailed results found, parsing traditional validation log...")
                validation_results = parse_validation_log(log_content)
                if not validation_results:
                    print("Error: Failed to parse validation results")
                    return jsonify(success=False, message="Failed to parse validation results"), 500

                print("Formatting results for frontend...")
                formatted_results = {
                    'success': True,
                    'tables': [],
                    'run_id': run_id,
                    'run_path': run_path
                }

                # Process each table's results (legacy format)
                for table_name, table_data in validation_results['row_counts'].items():
                    table_result = {
                        'tableName': table_name,
                        'sourceRows': table_data['source_rows'],
                        'targetRows': table_data['target_rows'],
                        'rowsNotInTarget': table_data['source_diff'],
                        'rowsNotInSource': table_data['target_diff'],
                        'fieldsMismatch': table_data['field_mismatch'],
                        'sourceTime': '',
                        'targetTime': '',
                        'sourceNotInTargetRows': [],  # Empty for legacy format
                        'targetNotInSourceRows': [],  # Empty for legacy format  
                        'fieldMismatchRows': [],      # Empty for legacy format
                        'hasDifferences': (table_data['source_diff'] > 0 or table_data['target_diff'] > 0 or table_data['field_mismatch'] > 0)
                    }

                    formatted_results['tables'].append(table_result)

                print("Legacy validation completed successfully")
                return jsonify(formatted_results)

        except Exception as e:
            print(f"Error in validation process: {str(e)}")
            return jsonify(success=False, message=f"Error in validation process: {str(e)}"), 500

    except Exception as e:
        print(f"Unexpected error in validation process: {str(e)}")
        return jsonify(success=False, message=f"Unexpected error in validation process: {str(e)}"), 500

def parse_validation_log(content):
    """Parse validation report content and extract structured data"""
    try:
        results = {
            'row_counts': {},
            'tables': [],
            'mismatches': []
        }
        
        lines = content.split('\n')
        current_table = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Extract table name
            if line.startswith('Table:'):
                current_table = line.split('Table:')[1].strip()
                if current_table not in results['row_counts']:
                    results['row_counts'][current_table] = {
                        'source_rows': 0,
                        'target_rows': 0,
                        'source_diff': 0,
                        'target_diff': 0,
                        'field_mismatch': 0
                    }

            # Process row counts
            elif line.startswith('Source Rows:'):
                if current_table:
                    try:
                        count = int(line.split('Source Rows:')[1].strip())
                        results['row_counts'][current_table]['source_rows'] = count
                    except ValueError:
                        print(f"Warning: Could not parse Source Rows count from line: {line}")

            elif line.startswith('Target Rows:'):
                if current_table:
                    try:
                        count = int(line.split('Target Rows:')[1].strip())
                        results['row_counts'][current_table]['target_rows'] = count
                    except ValueError:
                        print(f"Warning: Could not parse Target Rows count from line: {line}")

            elif line.startswith('Rows in Source not in Target:'):
                if current_table:
                    try:
                        count = int(line.split('Rows in Source not in Target:')[1].strip())
                        results['row_counts'][current_table]['source_diff'] = count
                    except ValueError:
                        print(f"Warning: Could not parse Source diff count from line: {line}")

            elif line.startswith('Rows in Target not in Source:'):
                if current_table:
                    try:
                        count = int(line.split('Rows in Target not in Source:')[1].strip())
                        results['row_counts'][current_table]['target_diff'] = count
                    except ValueError:
                        print(f"Warning: Could not parse Target diff count from line: {line}")

            elif line.startswith('Field Mismatches:'):
                if current_table:
                    try:
                        count = int(line.split('Field Mismatches:')[1].strip())
                        results['row_counts'][current_table]['field_mismatch'] = count
                    except ValueError:
                        print(f"Warning: Could not parse Field mismatch count from line: {line}")

        return results

    except Exception as e:
        print(f"Error parsing validation log: {str(e)}")
        return {
            'row_counts': {},
            'tables': [],
            'mismatches': []
        }

def load_detailed_validation_results(run_dir):
    """Load detailed validation results from JSON file"""
    detailed_results_file = os.path.join(run_dir, "detailed_validation_results.json")
    
    if os.path.exists(detailed_results_file):
        try:
            with open(detailed_results_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading detailed results: {str(e)}")
            return None
    return None

def format_table_display_data(table_data):
    """Format table data for frontend display - FIXED for cross-database comparison"""
    
    # Extract source and target table names for proper cross-comparison display
    source_table_name = table_data.get('source_table', '')
    target_table_name = table_data.get('target_table', '')
    
    # Use a meaningful comparison name instead of just source table name
    comparison_name = f"{source_table_name} ↔ {target_table_name}"
    if source_table_name == target_table_name:
        # This indicates the old self-comparison bug - show warning
        print(f"⚠️  WARNING: Self-comparison detected for {source_table_name}")
        comparison_name = f"⚠️ {source_table_name} (SELF-COMPARISON ISSUE)"
    
    display_data = {
        'tableName': comparison_name,
        'sourceTable': source_table_name,
        'targetTable': target_table_name,
        'sourceRows': table_data.get('source_rows', 0),
        'targetRows': table_data.get('target_rows', 0),
        'sourceTime': f"{table_data.get('source_time', 0):.2f}s",
        'targetTime': f"{table_data.get('target_time', 0):.2f}s",
        'differences': table_data.get('differences', {}),
        
        # Summary counts
        'rowsNotInTarget': table_data.get('differences', {}).get('source_not_in_target_count', 0),
        'rowsNotInSource': table_data.get('differences', {}).get('target_not_in_source_count', 0),
        'fieldsMismatch': table_data.get('differences', {}).get('field_mismatches_count', 0),
        
        # Actual row data (limited to 10 rows each)
        'sourceNotInTargetRows': table_data.get('differences', {}).get('source_not_in_target', [])[:10],
        'targetNotInSourceRows': table_data.get('differences', {}).get('target_not_in_source', [])[:10],
        'fieldMismatchRows': table_data.get('differences', {}).get('field_mismatches', [])[:10],
        
        # Add validation for cross-comparison
        'isCrossComparison': source_table_name != target_table_name,
        'comparisonType': 'cross-database' if source_table_name != target_table_name else 'self-comparison'
    }
    
    return display_data

@bp.route('/report', methods=['GET'])
def get_latest_report():
    import glob
    try:
        # Search all logs inside runs/<run_id>/logs/
        log_files = sorted(glob.glob('runs/*/logs/validation_main_*.log'), reverse=True)
        if not log_files:
            return jsonify(message="No validation logs found."), 404

        with open(log_files[0], 'r') as f:
            return jsonify(report=f.read())
    except Exception as e:
        return jsonify(message=f"Error reading report: {str(e)}"), 500


@bp.route('/download-report', methods=['GET'])
def download_report():
    import glob
    try:
        latest_gz = sorted(glob.glob('runs/*/logs/validation_main_*.log.gz'), reverse=True)
        if not latest_gz:
            return jsonify(message="No compressed report found."), 404
        return send_file(latest_gz[0], as_attachment=True)
    except Exception as e:
        return jsonify(message=f"Error sending report: {str(e)}"), 500

@bp.route('/generate-ddl', methods=['POST'])
def generate_ddl():
    try:
        data = request.get_json()
        
        # Add include_fields and exclude_fields to the data if they exist in the request
        if 'includeColumns' in data:
            data['include_fields'] = ','.join(data['includeColumns'])
        if 'excludeColumns' in data:
            data['exclude_fields'] = ','.join(data['excludeColumns'])
            
        ddl = generate_ddl_statement(data)

        # Save to ddl/ddl.sql
        os.makedirs("ddl", exist_ok=True)
        with open("ddl/ddl.sql", "w") as f:
            f.write(ddl)

        return jsonify(success=True, ddl=ddl)
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

@bp.route('/validation-report', methods=['GET'])
def get_validation_report():
    """
    Get the latest validation report in a structured format.
    Returns both detailed and consolidated reports.
    """
    try:
        # Find the latest validation log file
        import glob
        log_files = sorted(glob.glob('runs/*/logs/validation.log*'), reverse=True)
        
        if not log_files:
            return jsonify({
                'success': False,
                'message': 'No validation reports found'
            }), 404

        latest_log = log_files[0]
        run_dir = os.path.dirname(os.path.dirname(latest_log))
        
        # Read the log content
        try:
            if latest_log.endswith('.gz'):
                with gzip.open(latest_log, 'rt') as f:
                    content = f.read()
            else:
                with open(latest_log, 'r') as f:
                    content = f.read()
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error reading log file: {str(e)}'
            }), 500

        # Parse the raw validation data
        raw_data = parse_validation_log(content)
        
        # Format the data according to frontend expectations
        formatted_report = {
            'detailed_report': {
                'tables': []
            },
            'consolidated_report': {
                'tables': []
            },
            'summary': {
                'total_tables': len(raw_data['row_counts']),
                'total_differences': 0,
                'tables_with_differences': 0,
                'total_source_rows': 0,
                'total_target_rows': 0
            },
            'job_info': {
                'start_time': '',
                'end_time': ''
            }
        }

        # Process each table's data
        row_counts = raw_data.get('row_counts') or {}
        for table_name, counts in row_counts.items():
            # Find table info from raw data
            tables_info = raw_data.get('tables') or []
            table_info = next((t for t in tables_info if t.get('name') == table_name), None)
            
            # Calculate differences
            has_differences = (
                counts['source_diff'] > 0 or 
                counts['target_diff'] > 0 or 
                counts['field_mismatch'] > 0
            )
            
            if has_differences:
                formatted_report['summary']['tables_with_differences'] += 1
                formatted_report['summary']['total_differences'] += (
                    counts['source_diff'] + 
                    counts['target_diff'] + 
                    counts['field_mismatch']
                )
            
            # Update summary totals
            formatted_report['summary']['total_source_rows'] += counts['source_rows']
            formatted_report['summary']['total_target_rows'] += counts['target_rows']
            
            # Add to detailed report
            detailed_table = {
                'name': table_name,
                'checksum': {
                    'source': table_info['checksum_source'] if table_info else '',
                    'target': table_info['checksum_target'] if table_info else '',
                    'match': (table_info['checksum_source'] == table_info['checksum_target']) if table_info else False
                },
                'timing': {
                    'source': {
                        'start': '',
                        'end': '',
                        'elapsed': table_info['timing']['source'] if table_info else ''
                    },
                    'target': {
                        'start': '',
                        'end': '',
                        'elapsed': table_info['timing']['target'] if table_info else ''
                    }
                },
                'differences': {
                    'source_missing': [],
                    'target_missing': [],
                    'field_mismatches': []
                }
            }
            
            # Add mismatch details
            mismatches = raw_data.get('mismatches') or []
            for mismatch in mismatches:
                if mismatch.get('table') == table_name:
                    detailed_table['differences']['field_mismatches'].extend(mismatch.get('details', []))
            
            formatted_report['detailed_report']['tables'].append(detailed_table)
            
            # Add to consolidated report
            consolidated_table = {
                'table_name': table_name,
                'source_rows': counts['source_rows'],
                'target_rows': counts['target_rows'],
                'source_missing': counts['source_diff'],
                'target_missing': counts['target_diff'],
                'field_mismatches': counts['field_mismatch']
            }
            
            formatted_report['consolidated_report']['tables'].append(consolidated_table)

        # Try to get job timing info from the run directory
        try:
            run_info_file = os.path.join(run_dir, 'run_info.json')
            if os.path.exists(run_info_file):
                with open(run_info_file, 'r') as f:
                    run_info = json.load(f)
                    formatted_report['job_info'].update(run_info)
        except Exception as e:
            print(f"Warning: Could not load run timing info: {str(e)}")
        
        return jsonify({
            'success': True,
            'report': formatted_report
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error processing validation report: {str(e)}'
        }), 500

@bp.route('/validation-results-detailed', methods=['GET'])
def get_detailed_validation_results():
    """
    Get detailed validation results including actual row differences.
    Returns structured data with tables, counts, and actual differing rows.
    """
    try:
        # Find the latest validation results
        import glob
        result_files = sorted(glob.glob('runs/*/detailed_validation_results.json'), reverse=True)
        
        if not result_files:
            return jsonify({
                'success': False,
                'message': 'No detailed validation results found'
            }), 404

        latest_results = result_files[0]
        run_dir = os.path.dirname(latest_results)
        
        # Load detailed results
        detailed_results = load_detailed_validation_results(run_dir)
        
        if not detailed_results:
            return jsonify({
                'success': False,
                'message': 'Failed to load detailed validation results'
            }), 500

        # Format for frontend display
        response_data = {
            'success': True,
            'summary': detailed_results.get('summary', {}),
            'tables': []
        }

        # Process each table's results for display
        tables_data = detailed_results.get('tables') or {}
        for table_name, table_data in tables_data.items():
            table_display = format_table_display_data(table_data)
            
            # Add additional formatting for better display
            table_display['formattedSummary'] = format_table_summary(table_display)
            
            response_data['tables'].append(table_display)

        return jsonify(response_data)

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving detailed validation results: {str(e)}'
        }), 500

def format_table_summary(table_data):
    """Format table summary in a way similar to the image you provided"""
    source_rows = table_data.get('sourceRows', 0)
    target_rows = table_data.get('targetRows', 0)
    rows_not_in_target = table_data.get('rowsNotInTarget', 0)
    rows_not_in_source = table_data.get('rowsNotInSource', 0)
    fields_mismatch = table_data.get('fieldsMismatch', 0)
    
    # Calculate differences
    source_diff_target = abs(source_rows - target_rows) if source_rows != target_rows else 0
    target_diff_source = abs(target_rows - source_rows) if target_rows != source_rows else 0
    
    return {
        'table_name': table_data.get('tableName', ''),
        'source_rows': source_rows,
        'target_rows': target_rows,
        'source_diff_target': source_diff_target,
        'target_diff_source': target_diff_source,
        'fields_mismatch': fields_mismatch,
        'rows_not_in_target_count': rows_not_in_target,
        'rows_not_in_source_count': rows_not_in_source,
        'has_differences': (rows_not_in_target > 0 or rows_not_in_source > 0 or fields_mismatch > 0)
    }

@bp.route('/formatted-validation-report', methods=['GET'])
def get_formatted_validation_report():
    """
    Get the formatted validation report in the exact format requested by user.
    Returns the formatted text report with checksums, differences, and summary tables.
    """
    try:
        # Find the latest formatted report
        import glob
        report_files = sorted(glob.glob('runs/*/logs/formatted_validation_report.txt'), reverse=True)
        
        if not report_files:
            return jsonify({
                'success': False,
                'message': 'No formatted validation report found'
            }), 404

        latest_report = report_files[0]
        
        # Read the formatted report
        try:
            with open(latest_report, 'r') as f:
                formatted_content = f.read()
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error reading formatted report: {str(e)}'
            }), 500

        return jsonify({
            'success': True,
            'formatted_report': formatted_content,
            'report_file': latest_report
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving formatted validation report: {str(e)}'
        }), 500

@bp.route('/validation-table-details/<table_name>', methods=['GET'])
def get_table_validation_details(table_name):
    """
    Get detailed row-level differences for a specific table.
    Returns actual rows that differ between source and target.
    """
    try:
        # Find the latest validation results
        import glob
        result_files = sorted(glob.glob('runs/*/detailed_validation_results.json'), reverse=True)
        
        if not result_files:
            return jsonify({
                'success': False,
                'message': 'No detailed validation results found'
            }), 404

        latest_results = result_files[0]
        run_dir = os.path.dirname(latest_results)
        
        # Load detailed results
        detailed_results = load_detailed_validation_results(run_dir)
        
        if not detailed_results or table_name not in detailed_results.get('tables', {}):
            return jsonify({
                'success': False,
                'message': f'Table {table_name} not found in validation results'
            }), 404

        table_data = detailed_results['tables'][table_name]
        differences = table_data.get('differences', {})
        
        response_data = {
            'success': True,
            'table_name': table_name,
            'source_table': table_data.get('source_table', ''),
            'target_table': table_data.get('target_table', ''),
            'summary': {
                'source_rows': table_data.get('source_rows', 0),
                'target_rows': table_data.get('target_rows', 0),
                'source_time': table_data.get('source_time', 0),
                'target_time': table_data.get('target_time', 0)
            },
            'differences': {
                'source_not_in_target': {
                    'count': differences.get('source_not_in_target_count', 0),
                    'rows': differences.get('source_not_in_target', [])[:10],  # Limit to 10
                    'showing_top_10': differences.get('source_not_in_target_count', 0) > 10
                },
                'target_not_in_source': {
                    'count': differences.get('target_not_in_source_count', 0),
                    'rows': differences.get('target_not_in_source', [])[:10],  # Limit to 10
                    'showing_top_10': differences.get('target_not_in_source_count', 0) > 10
                },
                'field_mismatches': {
                    'count': differences.get('field_mismatches_count', 0),
                    'rows': differences.get('field_mismatches', [])[:10],  # Limit to 10
                    'showing_top_10': differences.get('field_mismatches_count', 0) > 10
                }
            }
        }

        return jsonify(response_data)

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving table details: {str(e)}'
        }), 500

@bp.route('/discover-schema-tables', methods=['POST'])
def discover_schema_tables():
    """
    Discover all tables in source and target schemas for full schema comparison.
    Returns matched table pairs and suggests primary keys.
    """
    try:
        data = request.get_json()
        
        required_fields = ['source_db', 'target_db', 'sourceSchema', 'targetSchema']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify(success=False, message=f"Missing required fields: {', '.join(missing_fields)}"), 400

        source_db_info = data['source_db']
        target_db_info = data['target_db']
        source_schema = data['sourceSchema']
        target_schema = data['targetSchema']

        # Discover tables in source schema
        source_tables = []
        if source_db_info['db_type'] == 'db2':
            source_tables = fetch_db2_tables({
                'db_type': 'db2',
                'schema': source_schema,
                'host': source_db_info['host'],
                'port': source_db_info['port'],
                'database': source_db_info['database'],
                'username': source_db_info['username'],
                'password': source_db_info['password']
            })
        elif source_db_info['db_type'] == 'teradata':
            source_tables = fetch_teradata_tables({
                'db_type': 'teradata',
                'schema': source_schema,
                'host': source_db_info['host'],
                'port': source_db_info['port'],
                'database': source_db_info['database'],
                'username': source_db_info['username'],
                'password': source_db_info['password']
            })

        # Discover tables in target schema
        target_tables = []
        if target_db_info['db_type'] == 'db2':
            target_tables = fetch_db2_tables({
                'db_type': 'db2',
                'schema': target_schema,
                'host': target_db_info['host'],
                'port': target_db_info['port'],
                'database': target_db_info['database'],
                'username': target_db_info['username'],
                'password': target_db_info['password']
            })
        elif target_db_info['db_type'] == 'teradata':
            target_tables = fetch_teradata_tables({
                'db_type': 'teradata',
                'schema': target_schema,
                'host': target_db_info['host'],
                'port': target_db_info['port'],
                'database': target_db_info['database'],
                'username': target_db_info['username'],
                'password': target_db_info['password']
            })

        if not source_tables:
            return jsonify(success=False, message=f"No tables found in source schema {source_schema}"), 404
            
        if not target_tables:
            return jsonify(success=False, message=f"No tables found in target schema {target_schema}"), 404

        # Match tables between source and target schemas
        table_matches = []
        unmatched_source = []
        
        # Ensure we have lists, not None values
        source_tables = source_tables if source_tables is not None else []
        target_tables = target_tables if target_tables is not None else []
        unmatched_target = []
        if target_tables:
            unmatched_target.extend(target_tables)

        for source_table in source_tables:
            # Try exact match first
            if target_tables and source_table in target_tables:
                table_matches.append({
                    'source_table': source_table,
                    'target_table': source_table,
                    'match_type': 'exact'
                })
                if source_table in unmatched_target:
                    unmatched_target.remove(source_table)
            else:
                # Try case-insensitive match
                lower_match = None
                if target_tables:
                    for target_table in target_tables:
                        if source_table.lower() == target_table.lower():
                            lower_match = target_table
                            break
                
                if lower_match:
                    table_matches.append({
                        'source_table': source_table,
                        'target_table': lower_match,
                        'match_type': 'case_insensitive'
                    })
                    unmatched_target.remove(lower_match)
                else:
                    unmatched_source.append(source_table)

        # Get suggested primary keys for matched tables
        for match in table_matches:
            try:
                # Try to detect primary keys from the first matched table
                source_columns = get_table_columns_with_metadata(source_db_info, source_schema, match['source_table'])
                suggested_keys = suggest_primary_keys(source_columns)
                match['suggested_primary_keys'] = suggested_keys
                match['all_columns'] = [col['name'] for col in source_columns]
            except Exception as e:
                print(f"Error getting columns for {match['source_table']}: {str(e)}")
                match['suggested_primary_keys'] = []
                match['all_columns'] = []

        return jsonify({
            'success': True,
            'source_schema': source_schema,
            'target_schema': target_schema,
            'matched_tables': table_matches,
            'unmatched_source_tables': unmatched_source,
            'unmatched_target_tables': unmatched_target,
            'summary': {
                'total_source_tables': len(source_tables),
                'total_target_tables': len(target_tables),
                'matched_pairs': len(table_matches),
                'unmatched_source': len(unmatched_source),
                'unmatched_target': len(unmatched_target)
            }
        })

    except Exception as e:
        return jsonify(success=False, message=f"Error discovering schema tables: {str(e)}"), 500

def get_table_columns_with_metadata(db_info, schema, table):
    """Get table columns with metadata to help detect primary keys"""
    try:
        if db_info['db_type'] == 'db2':
            columns = fetch_db2_columns({
                'db_type': 'db2',
                'schema': schema,
                'table': table,
                'host': db_info['host'],
                'port': db_info['port'],
                'database': db_info['database'],
                'username': db_info['username'],
                'password': db_info['password']
            })
            # Convert to format expected by suggest_primary_keys
            return [{'name': col} for col in columns] if columns else []
        elif db_info['db_type'] == 'teradata':
            columns = fetch_teradata_columns({
                'db_type': 'teradata',
                'schema': schema,
                'table': table,
                'host': db_info['host'],
                'port': db_info['port'],
                'database': db_info['database'],
                'username': db_info['username'],
                'password': db_info['password']
            })
            # Convert to format expected by suggest_primary_keys
            return [{'name': col} for col in columns] if columns else []
    except Exception as e:
        print(f"Error fetching columns with metadata: {str(e)}")
        return []

def suggest_primary_keys(columns):
    """Suggest likely primary key columns based on naming patterns and metadata"""
    if not columns:
        return []
    
    # Common primary key patterns
    pk_patterns = [
        'id', 'pk', 'key', 'code', 'num', 'no', 'number'
    ]
    
    suggested_keys = []
    
    # Look for columns that match common PK patterns
    for col in columns:
        col_name = col['name'].lower()
        
        # Check if column name contains common PK patterns
        for pattern in pk_patterns:
            if pattern in col_name:
                suggested_keys.append(col['name'])
                break
        
        # Check if it's a single character/numeric ID field
        if col_name in ['id', 'pk', 'key'] or col_name.endswith('_id') or col_name.endswith('_pk'):
            if col['name'] not in suggested_keys:
                suggested_keys.append(col['name'])
    
    # If no obvious PKs found, suggest first few columns
    if not suggested_keys and columns:
        suggested_keys = [columns[0]['name']]
    
    return suggested_keys[:3]  # Return top 3 suggestions