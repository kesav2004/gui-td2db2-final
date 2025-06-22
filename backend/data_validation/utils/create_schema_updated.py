import pandas as pd
import io, json, sys, getopt, sqlparse
from parser import parser

# function to generate the schema definition based on the csv file
def generateSchemaInclude(df, schema):
    csv_flds = ['table', 'Keys', 'predicate', 'include_fields', 'groupby_fields']
    out_flds = ['table', 'keys', 'predicate', 'fields', 'groupby', 'datatype']
    output = []
    err_table = []

    print("Schema keys:", list(schema.keys()))
    print("Processing", len(df), "rows from CSV")

    for i in range(len(df)):
        try:
            user_table = str(df.loc[i, csv_flds[0]])
            print("Row", i, "- user_table:", user_table)
            
            lst_user_table = user_table.split(".")
            if len(lst_user_table) == 2:
                user = lst_user_table[0]
                table = lst_user_table[1]
            else:
                user = ''
                table = lst_user_table[0]

            print("Row", i, "- parsed user:", user, "table:", table)

            # Patch: Try to match table with or without schema/user prefix
            original_table = table
            if table not in schema:
                if '.' in user_table:
                    table_short = user_table.split('.')[-1]
                    if table_short in schema:
                        table = table_short
                        print("Row", i, "- matched table using short name:", table)
                    else:
                        print("Row", i, "- table not found in schema:", user_table)
                        err_table.append(user_table)
                        continue
                else:
                    print("Row", i, "- table not found in schema:", user_table)
                    err_table.append(user_table)
                    continue
            else:
                print("Row", i, "- table found in schema:", table)

            keys = str(df.loc[i, csv_flds[1]]) if str(df.loc[i, csv_flds[1]]) != 'nan' else ','.join(schema[table]['_keys_'])
            predicate = str(df.loc[i, csv_flds[2]]) if str(df.loc[i, csv_flds[2]]) != 'nan' else ''
            in_fields = str(df.loc[i, csv_flds[3]]) if str(df.loc[i, csv_flds[3]]) != 'nan' else ''
            gr_fields = str(df.loc[i, csv_flds[4]]) if str(df.loc[i, csv_flds[4]]) != 'nan' else ''

            schema_fields = schema[table]['_columns_']

            if in_fields != '':
                include_fields = in_fields.upper().split(",")
                include_list = [fld.strip() for fld in include_fields]
                schema_fields = [fld for fld in schema_fields if fld in include_list]

            row = {
                out_flds[0]: user + '.' + table if user else table,
                out_flds[1]: keys,
                out_flds[2]: predicate,
                out_flds[3]: ','.join(schema_fields),
                out_flds[4]: gr_fields,
                out_flds[5]: schema[table]['_coltype_'] if gr_fields != '' else {}
            }

            output.append(row)
            print("Row", i, "- successfully processed")

        except Exception as e:
            print("Row", i, "- Exception occurred:", str(e))
            # Don't add exception message to err_table, add the actual table name
            if 'user_table' in locals():
                err_table.append(user_table)
            else:
                err_table.append(f"Row {i} - parsing error")
            continue

    if len(err_table) > 0:
        print('No DDL for below tables:')
        print(*(t for t in err_table), sep='\n')

    return output



def generateSchemaExclude(df, schema):
    csv_flds = ['table', 'Keys', 'predicate', 'exclude_fields', 'groupby_fields']
    out_flds = ['table', 'keys', 'predicate', 'fields', 'groupby', 'datatype']
    output = []
    err_table = []

    print("Schema keys:", list(schema.keys()))
    print("Processing", len(df), "rows from CSV")

    for i in range(len(df)):
        try:
            user_table = str(df.loc[i, csv_flds[0]])
            print("Row", i, "- user_table:", user_table)
            
            lst_user_table = user_table.split(".")
            if len(lst_user_table) == 2:
                user = lst_user_table[0]
                table = lst_user_table[1]
            else:
                table = lst_user_table[0]

            print("Row", i, "- parsed user:", user if len(lst_user_table) == 2 else 'none', "table:", table)

            # Patch: Try to match table with or without schema/user prefix
            if table not in schema:
                if '.' in user_table:
                    table_short = user_table.split('.')[-1]
                    if table_short in schema:
                        table = table_short
                        print("Row", i, "- matched table using short name:", table)
                    else:
                        print("Row", i, "- table not found in schema:", user_table)
                        err_table.append(user_table)
                        continue
                else:
                    print("Row", i, "- table not found in schema:", user_table)
                    err_table.append(user_table)
                    continue
            else:
                print("Row", i, "- table found in schema:", table)

            keys = str(df.loc[i, csv_flds[1]]) if str(df.loc[i, csv_flds[1]]) != 'nan' else ','.join(schema[table]['_keys_'])
            predicate = str(df.loc[i, csv_flds[2]]) if str(df.loc[i, csv_flds[2]]) != 'nan' else ''
            ex_fields = str(df.loc[i, csv_flds[3]]) if str(df.loc[i, csv_flds[3]]) != 'nan' else ''
            gr_fields = str(df.loc[i, csv_flds[4]]) if str(df.loc[i, csv_flds[4]]) != 'nan' else ''

            if ex_fields != '':
                exclud_fields = ex_fields.upper().split(",")
                exclud_list = [fld.strip() for fld in exclud_fields]

                # fields minus exclude fields
                if table in schema:
                    schema_fields = schema[table]['_columns_']
                    for fld in exclud_list:
                        if fld in schema_fields:
                            schema_fields.remove(fld)
                else:
                    continue
            else:
                schema_fields = schema[table]['_columns_']

            row = {}
            row[out_flds[0]] = user + '.' + table if len(lst_user_table) == 2 else table
            row[out_flds[1]] = keys
            row[out_flds[2]] = predicate
            row[out_flds[3]] = ','.join(schema_fields)
            row[out_flds[4]] = gr_fields
            row[out_flds[5]] = schema[table]['_coltype_'] if gr_fields != '' else {}

            output.append(row)
            print("Row", i, "- successfully processed")

        except Exception as e:
            print("Row", i, "- Exception occurred:", str(e))
            # Don't add exception message to err_table, add the actual table name
            if 'user_table' in locals():
                err_table.append(user_table)
            else:
                err_table.append(f"Row {i} - parsing error")
            continue

    if len(err_table) > 0:
        print('No DDL for below tables:')
        print(*(t for t in err_table), sep='\n')

    return output


# function to check the args and return the in/out files
def getFiles(script, argv):
    csv_file = ''
    ddl_file = ''

    try:
        opts, args = getopt.getopt(argv, 'c:d:', ['csv=', 'ddl='])
    except getopt.GetoptError:
        print('Usage: ' + script + ' --csv <csv file> --ddl <ddl_file>')
        print('')
        sys.exit(2)

    for opt, arg in opts:
        if opt in ['-c', '--csv']:
            csv_file = arg
        elif opt in ('-d', '--ddl'):
            ddl_file = arg
        else:
           print('Usage: ' + script + ' --csv <csv file> --ddl <ddl_file>')
           print('')
           sys.exit()

    return csv_file, ddl_file


if __name__ == '__main__':

    script = sys.argv[0]
    args = sys.argv[1:] if len(sys.argv) > 1 else []

    f_output = 'schema'
    f_csv, f_ddl = getFiles(script, args)
    print('CSV File : ' + str(f_csv))
    print('DDL File : ' + str(f_ddl))
    print('')

    ddl = parser()

    try:
        # Use full paths for both files
        with open(f_ddl) as file:
            lines = file.read()
        
        print("DDL content length:", len(lines), "characters")
        print("DDL content preview:", lines[:200] + "..." if len(lines) > 200 else lines)

        parse = sqlparse.parse(lines)
        result = ddl.parse_ddl(parse)
        print("DDL parse result:", result)

        # generating the schema json file
        with io.open(f_output + '.json', 'w', encoding='utf-8') as f:
            f.write(json.dumps(result, indent=4, sort_keys=False))

        # Use full path for CSV
        df_csv = pd.read_csv(f_csv)
        print(df_csv)

        # Determine which schema function to use
        if 'include_fields' in df_csv.columns:
            for i in range(len(df_csv)):
                user_table = str(df_csv.loc[i, 'table'])
                print("Looking for table:", user_table)
            schema = generateSchemaInclude(df_csv, result)
        elif 'exclude_fields' in df_csv.columns:
            for i in range(len(df_csv)):
                user_table = str(df_csv.loc[i, 'table'])
                print("Looking for table:", user_table)
            schema = generateSchemaExclude(df_csv, result)
        else:
            raise ValueError("CSV must contain either 'include_fields' or 'exclude_fields' column")

        if len(schema) == 0:
            raise ValueError("No schema was generated. Please check your CSV or DDL.")

        # generating the schema py file
        with io.open(f_output + '.py', 'w', encoding='utf-8') as f:
            f.write(json.dumps(schema, indent=4, sort_keys=False))

        print('File schema.py generated successfully!')

    except Exception as e:
        import traceback
        print('Error in generating schema, check the csv/ddl file!!')
        traceback.print_exc()