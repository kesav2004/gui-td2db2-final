import sys
import os
import re
from datetime import datetime
from sp_converter import SPConverter, _protect_string_literals, _restore_protected_strings

# Special tokens for SQL processing
NEWLINE_TOKEN = "__NEWLINE__"

def strip_comments(sql: str) -> str:
    """Remove SQL comments while preserving string literals."""
    sql, protected = _protect_string_literals(sql)
    sql = re.sub(r'--[^\r\n]*', '', sql)
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    sql = _restore_protected_strings(sql, protected)
    return sql

def replace_newlines(sql: str) -> str:
    """Replace newlines with a token to preserve formatting."""
    sql, protected = _protect_string_literals(sql)
    sql = sql.replace('\n', f' {NEWLINE_TOKEN} ')
    sql = _restore_protected_strings(sql, protected)
    return sql

def restore_newlines(sql: str) -> str:
    """Restore newlines from tokens."""
    return sql.replace(NEWLINE_TOKEN, '\n')

def clean_whitespace(sql: str) -> str:
    """Normalize whitespace while preserving string literals."""
    sql, protected = _protect_string_literals(sql)
    sql = re.sub(r'\s+', ' ', sql).strip()
    sql = _restore_protected_strings(sql, protected)
    return sql

def print_usage():
    print("Usage:")
    print("  python main.py <input_file.sql> <output_file.sql>")
    print("Example:")
    print("  python main.py input/TD001.sql output/DB2_out.sql")

def validate_file_paths(input_path, output_path, pattern_path):
    errors = []
    if not os.path.isfile(input_path):
        errors.append(f"Input file not found: {input_path}")
    if not os.path.isfile(pattern_path):
        errors.append(f"Pattern file not found: {pattern_path}")
    if os.path.dirname(output_path) and not os.path.exists(os.path.dirname(output_path)):
        try:
            os.makedirs(os.path.dirname(output_path))
        except OSError as e:
            errors.append(f"Cannot create output directory: {str(e)}")

    if errors:
        print("❌ Errors:")
        for err in errors:
            print(f" - {err}")
        return False
    return True

def convert_sp(input_path, output_path, pattern_path):
    with open(input_path, "r", encoding="utf-8") as infile:
        sql = infile.read()

    # Protect string literals globally
    sql, protected = _protect_string_literals(sql)
    if not isinstance(sql, str):
        raise TypeError(f"Expected string from _protect_string_literals, got {type(sql)}")

    sql = strip_comments(sql)
    sql = replace_newlines(sql)

    # Apply interval patterns with protection
    interval_patterns = [
        (r"INTERVAL\s*'(\d+)'\s+DAY(?!\w)", r"\1 DAYS"),
        (r"INTERVAL\s*'(\d+)'\s+MONTH(?!\w)", r"\1 MONTHS"),
        (r"INTERVAL\s*'(\d+)'\s+YEAR(?!\w)", r"\1 YEARS"),
        (r"INTERVAL\s*'(\d+)'\s+HOUR(?!\w)", r"\1 HOURS"),
        (r"INTERVAL\s*'(\d+)'\s+MINUTE(?!\w)", r"\1 MINUTES"),
    ]
    for pattern, replacement in interval_patterns:
        temp_sql, temp_protected = _protect_string_literals(sql)
        temp_sql = re.sub(pattern, replacement, temp_sql, flags=re.IGNORECASE)
        sql = _restore_protected_strings(temp_sql, temp_protected)

    sql = clean_whitespace(sql)
    converter = SPConverter(sql)
    converter.load_patterns(pattern_path)
    try:
        converted_sql = converter.convert()
    except Exception as e:
        print(f"Error in SPConverter.convert: {str(e)}")
        raise

    # Restore string literals
    converted_sql = _restore_protected_strings(converted_sql, protected)
    converted_sql = restore_newlines(converted_sql)

    if converted_sql.rstrip().endswith(";"):
        converted_sql = converted_sql.rstrip()[:-1] + "@"

    with open(output_path, "w", encoding="utf-8") as outfile:
        outfile.write(converted_sql + "\n")

    return converter

def generate_conversion_report(converter: SPConverter, output_path: str) -> str:
    report = []
    report.append(f"Conversion Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("=" * 50)

    warnings = converter.get_conversion_warnings()
    if warnings:
        report.append("\n⚠️ Conversion Warnings:")
        for i, warning in enumerate(warnings, 1):
            report.append(f"{i}. {warning}")
    else:
        report.append("\n✅ No conversion warnings detected")

    unconverted = converter.get_unconverted_lines()
    unconverted = [line.replace("__NEWLINE__", "\n") for line in unconverted]
    if unconverted:
        report.append("\n🔧 Manual Review Needed:")
        for line in unconverted:
            report.append(f" - {line}")
    else:
        report.append("\n✅ All lines converted successfully")

    report.append("\n" + "=" * 50)
    report.append(f"Output file: {output_path}")
    return "\n".join(report)

def main():
    if len(sys.argv) != 3:
        print("❌ Invalid arguments.")
        print_usage()
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    pattern_path = "patterns/sp_patterns.cfg"
    report_path = f"{os.path.splitext(output_path)[0]}_report.sql"

    if not validate_file_paths(input_path, output_path, pattern_path):
        sys.exit(1)

    try:
        converter = convert_sp(input_path, output_path, pattern_path)
        print(f"✅ SQL converted and saved to: {output_path}")
        report = generate_conversion_report(converter, output_path)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"📄 Conversion report saved to: {report_path}")
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()