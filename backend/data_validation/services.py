import ibm_db
import teradatasql
from .queries import *


def validate_teradata_connection(details):
    port = details.get('port') or '1025'
    conn = teradatasql.connect(
        host=details['host'],
        user=details['username'],
        password=details['password'],
        database=details['database']
    )
    conn.close()
    return True


def validate_db2_connection(details):
    port = details.get('port') or '50000'
    conn_str = (
        f"DATABASE={details['database']};"
        f"HOSTNAME={details['host']};"
        f"PORT={port};"
        f"PROTOCOL=TCPIP;"
        f"UID={details['username']};"
        f"PWD={details['password']};"
    )
    conn = ibm_db.connect(conn_str, "", "")
    ibm_db.close(conn)
    return True


def fetch_db2_schemas(details):
    port = details.get('port') or '50000'
    conn_str = (
        f"DATABASE={details['database']};"
        f"HOSTNAME={details['host']};"
        f"PORT={port};"
        f"PROTOCOL=TCPIP;"
        f"UID={details['username'].strip()};"
        f"PWD={details['password'].strip()};"
    )
    conn = ibm_db.connect(conn_str, "", "")
    stmt = ibm_db.exec_immediate(conn, DB2_SCHEMA_LIST_SQL)
    result = []
    row = ibm_db.fetch_assoc(stmt)
    while row:
        result.append(row["SCHEMANAME"])
        row = ibm_db.fetch_assoc(stmt)
    ibm_db.close(conn)
    return result


def fetch_db2_tables(details):
    port = details.get('port') or '50000'
    conn_str = (
        f"DATABASE={details['database']};"
        f"HOSTNAME={details['host']};"
        f"PORT={port};"
        f"PROTOCOL=TCPIP;"
        f"UID={details['username'].strip()};"
        f"PWD={details['password'].strip()};"
    )
    conn = ibm_db.connect(conn_str, "", "")
    stmt = ibm_db.prepare(conn, DB2_TABLE_LIST_SQL)
    ibm_db.execute(stmt, (details['schema'].upper(),))
    result = []
    row = ibm_db.fetch_assoc(stmt)
    while row:
        result.append(row["TABNAME"])
        row = ibm_db.fetch_assoc(stmt)
    ibm_db.close(conn)
    return result


def fetch_db2_columns(details):
    port = details.get('port') or '50000'
    conn_str = (
        f"DATABASE={details['database']};"
        f"HOSTNAME={details['host']};"
        f"PORT={port};"
        f"PROTOCOL=TCPIP;"
        f"UID={details['username'].strip()};"
        f"PWD={details['password'].strip()};"
    )
    conn = ibm_db.connect(conn_str, "", "")
    stmt = ibm_db.prepare(conn, DB2_COLUMN_LIST_SQL)
    ibm_db.execute(stmt, (details['schema'].upper(), details['table'].upper()))
    result = []
    row = ibm_db.fetch_assoc(stmt)
    while row:
        result.append(row["COLNAME"])
        row = ibm_db.fetch_assoc(stmt)
    ibm_db.close(conn)
    return result


def fetch_teradata_schemas(details):
    port = details.get('port') or '1025'
    conn = teradatasql.connect(
        host=details['host'],
        user=details['username'].strip(),
        password=details['password'].strip(),
        database=details['database']
    )
    cur = conn.cursor()
    cur.execute(TERADATA_SCHEMA_LIST_SQL)
    return [row[0] for row in cur.fetchall()]


def fetch_teradata_tables(details):
    port = details.get('port') or '1025'
    conn = teradatasql.connect(
        host=details['host'],
        user=details['username'].strip(),
        password=details['password'].strip(),
        database=details['database']
    )
    cur = conn.cursor()
    cur.execute(TERADATA_TABLE_LIST_SQL, (details['schema'],))
    return [row[0] for row in cur.fetchall()]


def fetch_teradata_columns(details):
    port = details.get('port') or '1025'
    conn = teradatasql.connect(
        host=details['host'],
        user=details['username'].strip(),
        password=details['password'].strip(),
        database=details['database']
    )
    cur = conn.cursor()
    cur.execute(TERADATA_COLUMN_LIST_SQL, (details['schema'], details['table']))
    return [row[0] for row in cur.fetchall()]

def generate_ddl_statement(details):
    db_type = details.get('db_type')
    schema = details.get('schema')
    table = details.get('table')
    include_fields = [field.strip().upper() for field in details.get('include_fields', '').split(',')] if details.get('include_fields') else []
    exclude_fields = [field.strip().upper() for field in details.get('exclude_fields', '').split(',')] if details.get('exclude_fields') else []

    if db_type == 'db2':
        port = details.get('port') or '50000'
        conn_str = (
            f"DATABASE={details['database']};"
            f"HOSTNAME={details['host']};"
            f"PORT={port};"
            f"PROTOCOL=TCPIP;"
            f"UID={details['username']};"
            f"PWD={details['password']};"
        )
        conn = ibm_db.connect(conn_str, "", "")
        stmt = ibm_db.prepare(conn, """
            SELECT COLNAME, TYPENAME, LENGTH, SCALE 
            FROM SYSCAT.COLUMNS 
            WHERE TABSCHEMA = ? AND TABNAME = ? 
            ORDER BY COLNO
        """)
        ibm_db.execute(stmt, (schema.upper(), table.upper()))

        ddl = f"CREATE TABLE {schema}.{table} (\n"
        cols = []
        while row := ibm_db.fetch_assoc(stmt):
            name = row['COLNAME']
            # Skip if column should be excluded or not in include_fields
            if (exclude_fields and name.upper() in exclude_fields) or \
               (include_fields and name.upper() not in include_fields):
                continue
                
            typ = row['TYPENAME']
            length = row['LENGTH']
            scale = row.get('SCALE', 0)
            if typ in ['DECIMAL', 'NUMERIC']:
                cols.append(f"    {name} {typ}({length},{scale})")
            elif typ in ['CHARACTER', 'VARCHAR', 'CHAR', 'VARCHAR2']:
                cols.append(f"    {name} {typ}({length})")
            else:
                cols.append(f"    {name} {typ}")
        ddl += ",\n".join(cols) + "\n);\n"
        ibm_db.close(conn)
        return ddl

    elif db_type == 'teradata':
        port = details.get('port') or '1025'
        conn = teradatasql.connect(
            host=details['host'],
            user=details['username'],
            password=details['password'],
            database=details['database']
        )
        cur = conn.cursor()
        cur.execute("""
            SELECT ColumnName, ColumnType, ColumnLength, DecimalTotalDigits, DecimalFractionalDigits
            FROM DBC.ColumnsV
            WHERE DatabaseName = ? AND TableName = ?
            ORDER BY ColumnId
        """, (schema, table))

        ddl = f"CREATE TABLE {schema}.{table} (\n"
        cols = []
        for row in cur.fetchall():
            name, typ, length, prec, scale = row
            # Skip if column should be excluded or not in include_fields
            if (exclude_fields and name.upper() in exclude_fields) or \
               (include_fields and name.upper() not in include_fields):
                continue
                
            if typ == 'DECIMAL':
                cols.append(f"    {name} {typ}({prec},{scale})")
            elif typ in ['VARCHAR', 'CHAR']:
                cols.append(f"    {name} {typ}({length})")
            else:
                cols.append(f"    {name} {typ}")
        ddl += ",\n".join(cols) + "\n);\n"
        cur.close()
        conn.close()
        return ddl

    else:
        raise Exception("Unsupported DB type")
