import re
import uuid

def _protect_string_literals(code: str) -> tuple[str, dict]:
    """Protect single- and double-quoted string literals, including escaped quotes."""
    protected = {}
    pattern = r"""
        (?:
            '(?:''|[^'])*?'  # Single-quoted strings with optional embedded quotes
          | "(?:""|[^"])*?"  # Double-quoted strings with optional embedded quotes
        )
    """
    counter = 0
    run_id = str(uuid.uuid4())[:8]  # Unique run ID for placeholders

    def replace_match(match):
        nonlocal counter
        placeholder = f'__STR_{run_id}_{counter}__'
        if placeholder in code:
            raise ValueError(f"Placeholder {placeholder} already exists in code")
        protected[placeholder] = match.group(0)
        counter += 1
        return placeholder

    protected_code = re.sub(pattern, replace_match, code, flags=re.VERBOSE)
    return protected_code, protected

def _restore_protected_strings(code: str, protected: dict) -> str:
    """Restore string literals from placeholders."""
    for placeholder, original in protected.items():
        code = code.replace(placeholder, original)
    return code

def remove_sql_security_invoker(sql: str) -> str:
    """
    Remove SQL SECURITY INVOKER clause from SQL text.
    """
    pattern = r'\bSQL\s+SECURITY\s+INVOKER\b\s*'
    return re.sub(pattern, '', sql, flags=re.IGNORECASE)

def replace_first_begin(sql_text):
    """
    Replaces the first standalone BEGIN with 'LANGUAGE SQL\\nBEGIN',
    but only if not already replaced.
    """
    lines = sql_text.splitlines()
    for i, line in enumerate(lines):
        if re.search(r'\bLANGUAGE SQL\b', line, re.IGNORECASE):
            # Already converted, skip
            return sql_text
        if re.search(r'^\s*\bBEGIN\b\s*$', line, re.IGNORECASE):
            lines[i] = 'LANGUAGE SQL\n BEGIN'
            break
        elif re.search(r'\bBEGIN\b', line, re.IGNORECASE):
            lines[i] = re.sub(r'\bBEGIN\b', 'LANGUAGE SQL\n BEGIN', line, count=1, flags=re.IGNORECASE)
            break
    return '\n'.join(lines)

class SPConverter:
    def __init__(self, sql: str):
        self.sql = sql
        self.replacements = {}
        self.sp_head_patterns = {}
        self.sp_body_patterns = {}
        self.unconverted_lines = []
        self.warnings = []
        self.error_mappings = {
            '-5522': '42704',  # Table does not exist
            '3706': '42601',   # Syntax error
            '-3706': '42601',  # Syntax error (consistent with patterns)
            '-2616': '22012',  # Division by zero
            '-7547': '42884',  # Function not found
            '-2603': '23505',  # Duplicate row
            '-803': '23505',   # Unique constraint violation
            '-407': '23502',   # Null violation
            '-433': '22001',   # Value too long
            '-204': '42704',   # Table not found (alternate)
            '-440': '42884',   # Routine not found
            '-911': '40001',   # Deadlock or timeout
            '100': '02000',    # No data (cursor)
            '0': '00000',      # Success
            '23505': '23505',  # Duplicate key
            '42000': '42601',  # cleanup code
            'U0000': '58004',  # Teradata internal error
            '-104': '42601'    # General SQL syntax error
        }
   
    def load_patterns(self, pattern_file_path: str):
        """
        Load SP_HEAD and SP_BODY patterns from the .cfg file.
        Format: SP_HEAD|<regex pattern>|<replacement>
        """
        with open(pattern_file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("|")
                if len(parts) != 3:
                    continue  # Skip malformed lines
                section, pattern, replacement = parts
                if section == "SP_HEAD":
                    self.sp_head_patterns[pattern.strip()] = replacement.strip()
                elif section == "SP_BODY":
                    self.sp_body_patterns[pattern.strip()] = replacement.strip()
    
    def mask_string_literals(self, text):
        """
        Improved string literal masking that handles nested quotes better
        """
        placeholders = {}
        pattern = r"""
            (?:                 # Non-capturing group for alternation
                '(?:''|[^'])*'  # Single-quoted strings
            | "(?:""|[^"])*"  # Double-quoted strings
            )
        """
        
        def replacer(match):
            key = f"__STR_PLACEHOLDER_{len(placeholders)}__"
            placeholders[key] = match.group(0)
            return key

        text = re.sub(pattern, replacer, text, flags=re.VERBOSE)
        return text, placeholders

    def unmask_string_literals(self, text, placeholders):
        """
        Replace all placeholders with their original quoted string values.
        """
        for key, val in placeholders.items():
            text = re.sub(re.escape(key), val, text)
        return text

    def apply_patterns(self, sql: str, pattern_map: dict, section: str) -> str:
        """
        Apply regex substitutions from the provided pattern dictionary.
        Also track unconverted lines and generate warnings for complex patterns.
        """
        # Step 1: Mask string literals to avoid accidental substitutions
        sql, string_placeholders = self.mask_string_literals(sql)

        # Step 2: Apply patterns to entire SQL for multiline matches (SP_HEAD only)
        converted_sql = sql
        if section == "SP_HEAD":
            for pattern, replacement in pattern_map.items():
                try:
                    new_sql = re.sub(pattern, replacement, converted_sql, flags=re.IGNORECASE)
                    if new_sql != converted_sql:
                        converted_sql = new_sql
                except re.error as e:
                    self.warnings.append(f"Error with pattern '{pattern}': {str(e)}")

        # Step 3: Process line by line for SP_BODY or remaining SP_HEAD patterns
        converted_lines = []
        for line in converted_sql.splitlines():
            original_line = line
            converted = False
            if section == "SP_BODY":
                for pattern, replacement in pattern_map.items():
                    try:
                        if re.search(pattern, line, flags=re.IGNORECASE):
                            new_line = re.sub(pattern, replacement, line, flags=re.IGNORECASE)
                            if new_line != line:
                                converted = True
                                line = new_line
                                if replacement.startswith("-- TODO:") or replacement.startswith("-- NOTE:"):
                                    self.warnings.append(f"Manual intervention needed: {replacement[2:]}")
                    except re.error as e:
                        self.warnings.append(f"Error with pattern '{pattern}': {str(e)}")
            converted_lines.append(line)
            # Only flag non-trivial lines (exclude procedure definition boilerplate)
            if not converted and original_line.strip() and not re.match(
                r'^\s*(CREATE OR REPLACE PROCEDURE|\(|,|OUT|IN|LANGUAGE SQL|$)', 
                original_line.strip(), re.IGNORECASE
            ):
                self.unconverted_lines.append(f"[{section}] {original_line.strip()}")

        sql_result = "\n".join(converted_lines)

        # Step 4: Unmask string literals
        sql_result = self.unmask_string_literals(sql_result, string_placeholders)

        # Step 5: Apply additional custom logic for SP_HEAD
        if section == "SP_HEAD":
            sql_result = replace_first_begin(sql_result)

        return sql_result

    def add_done_handling(self, sql: str) -> str:
        """
        Add DECLARE done and cursor handling if not present
        """
        if "declare done" not in sql.lower():
            declare_pattern = r"(DECLARE\s+\w+\s+\w+(?:\([^)]+\))?;)"

            declares = list(re.finditer(declare_pattern, sql, re.IGNORECASE))
            if declares:
                last_declare = declares[-1]
                insert_pos = last_declare.end()
                sql = sql[:insert_pos] + "\n     DECLARE done INT DEFAULT 0;" + sql[insert_pos:]

        if "SET DONE = 1;" not in sql:
            handler_pattern = re.compile(
                r"(DECLARE\s+CONTINUE\s+HANDLER\s+FOR\s+NOT\s+FOUND\s+)(BEGIN\s*)?(.*?)(END;)?",
                re.DOTALL
            )

            def repl(m):
                before = m.group(1)
                begin = m.group(2) or ''
                body = m.group(3) or ''
                end = m.group(4) or ''
                if "SET DONE = 1;" in body.upper():
                    return m.group(0)
                if begin:
                    return f"{before}{begin}    SET DONE = 1;{body}{end}"
                else:
                    return f"{before}SET DONE = 1;{body}{end}"

            sql = handler_pattern.sub(repl, sql)

        return sql
    
    def convert_teradata_error_code_handling(self, input_sql: str) -> str:
        """
        Convert Teradata error codes to DB2-compatible format
        """
        def format_code(code: str) -> str:
            if code.startswith('-'):
                return code
            elif code.startswith('+'):
                return f"'{code[1:]}'"
            else:
                return f"'{code}'"

        def replace_code(match):
            original = match.group(1)
            db2_code = self.error_mappings.get(original)
            return format_code(db2_code) if db2_code else match.group(0)

        def replace_num_code(match):
            original = match.group(1)
            db2_code = self.error_mappings.get(original)
            return format_code(db2_code) if db2_code else original

        str_literal_pattern = re.compile(r"'(-?\d{4,5})'")
        output = str_literal_pattern.sub(replace_code, input_sql)

        num_literal_pattern = re.compile(r"(?<![\w'\"])(-?\d{4,5})(?![\w'\"])")
        output = num_literal_pattern.sub(replace_num_code, output)

        cleanup_pattern = re.compile(r"'+\s*'(\d{4,5})'\s*'+")
        output = cleanup_pattern.sub(r"'\1'", output)

        return output

    def convert_error_codes(self, sql: str) -> str:
        """
        Convert Teradata SQLCODE and SQLSTATE to DB2 SQLSTATE
        """
        for td_code, db2_state in self.error_mappings.items():
            sql = re.sub(
                rf'SQLCODE\s*[=!]=\s*{td_code}\b',
                f"SQLSTATE = '{db2_state}'",
                sql,
                flags=re.IGNORECASE
            )
            if td_code == '0':
                sql = re.sub(
                    r'IF\s+SQLCODE\s*!=\s*0\s+THEN',
                    "IF SQLSTATE <> '00000' THEN",
                    sql,
                    flags=re.IGNORECASE
                )
        return sql

    def inject_continue_handler_once(self, sql: str) -> str:
        """
        Inject DECLARE done INT and CONTINUE HANDLER once after last DECLARE.
        Only inject if no similar handler exists already.
        """
        if "DECLARE CONTINUE HANDLER FOR NOT FOUND" in sql.upper():
            return sql
            
        lines = sql.splitlines()
        output = []
        last_declare_pos = -1

        # Find the last DECLARE statement position
        for i, line in enumerate(lines):
            if re.match(r'^\s*DECLARE\b.*;', line.strip(), re.IGNORECASE):
                last_declare_pos = i

        # Inject after the last DECLARE if found
        if last_declare_pos >= 0:
            for i, line in enumerate(lines):
                output.append(line)
                if i == last_declare_pos:
                    output.append("    DECLARE done INT DEFAULT 0;")
                    output.append("    DECLARE CONTINUE HANDLER FOR NOT FOUND")
                    output.append("    BEGIN")
                    output.append("        SET done = 1;")
                    output.append("    END;")

        return "\n".join(output) if last_declare_pos >= 0 else sql

    def convert_exception_handlers(self, sql: str) -> str:
        """
        Special handling for exception-related conversions that need more context.
        """
        # Convert standalone exception blocks
        sql = re.sub(
            r'(?i)EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+(.*?)(?=\bEND\b|\bBEGIN\b)',
            r'DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN \1 END;',
            sql
        )
        
        # Convert SQLCODE checks to done variable where appropriate
        sql = re.sub(
            r'(?i)IF\s+SQLCODE\s*(!=|<>|=)\s*(\d+)\s+THEN',
            lambda m: f"IF done = 1 THEN" if m.group(2) in ['0', '100'] else m.group(0),
            sql
        )
        
        return sql

    # def inject_default_exception_handler(self, sql: str) -> str:
    #     """
    #     Inject a default exception handler if none exists.
    #     """
    #     if not re.search(r'(?i)DECLARE\s+(CONTINUE|EXIT)\s+HANDLER\s+FOR\s+SQLEXCEPTION', sql):
    #         lines = sql.splitlines()
    #         for i, line in enumerate(lines):
    #             if re.match(r'^\s*BEGIN\b', line.strip(), re.IGNORECASE):
    #                 lines.insert(i+1, "    DECLARE EXIT HANDLER FOR SQLEXCEPTION")
    #                 lines.insert(i+2, "    BEGIN")
    #                 lines.insert(i+3, "        GET DIAGNOSTICS EXCEPTION 1 err_code = RETURNED_SQLSTATE, err_msg = MESSAGE_TEXT;")
    #                 lines.insert(i+4, "        -- Log error or handle as needed")
    #                 lines.insert(i+5, "        RESIGNAL;")
    #                 lines.insert(i+6, "    END;")
    #                 self.warnings.append("Added default exception handler - please review")
    #                 break
    #         sql = "\n".join(lines)
    #     return sql

    def inject_cursor_handlers(self, sql: str) -> str:
        """
        Complete cursor handling solution that:
        1. Always adds DECLARE done INT DEFAULT 0
        2. Converts all NOT FOUND handlers to SET done = 1
        3. Ensures proper placement before BEGIN
        """
        # Check if there are any cursors
        if not re.search(r'DECLARE\s+\w+\s+CURSOR\s+FOR', sql, re.IGNORECASE):
            return sql

        lines = sql.splitlines()
        output = []
        in_declare_section = False
        cursor_found = False
        last_declare_line = -1

        # First pass: analyze the structure
        for i, line in enumerate(lines):
            if re.match(r'^\s*DECLARE\b', line, re.IGNORECASE):
                in_declare_section = True
                last_declare_line = i
                if re.match(r'^\s*DECLARE\s+\w+\s+CURSOR\s+FOR', line, re.IGNORECASE):
                    cursor_found = True
            elif re.match(r'^\s*(BEGIN|SET|OPEN)\b', line, re.IGNORECASE):
                in_declare_section = False

        if not cursor_found:
            return sql

        # Second pass: modify the code
        for i, line in enumerate(lines):
            output.append(line)
            
            # Convert empty NOT FOUND handlers
            if re.match(r'^\s*DECLARE\s+CONTINUE\s+HANDLER\s+FOR\s+NOT\s+FOUND\s+BEGIN\s*END;', line, re.IGNORECASE):
                output[-1] = re.sub(r'BEGIN\s*END;', 'SET done = 1;', line, flags=re.IGNORECASE)
            
            # Insert declarations at the end of DECLARE section
            if i == last_declare_line:
                # Check if done is already declared
                if not any(re.match(r'^\s*DECLARE\s+done\s+INT', l, re.IGNORECASE) for l in lines):
                    output.append("    DECLARE done INT DEFAULT 0;")
                
                # Check if handler is already declared
                if not any(re.match(r'^\s*DECLARE\s+CONTINUE\s+HANDLER\s+FOR\s+NOT\s+FOUND', l, re.IGNORECASE) for l in lines):
                    output.append("    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;")

        return "\n".join(output)

    def convert_cursor_checks(self, sql: str) -> str:
        """
        Convert cursor checks to use done variable
        """
        patterns = [
            (r'IF\s+SQLSTATE\s*=\s*[\'"]02000[\'"]\s+THEN', 'IF done = 1 THEN'),
            (r'IF\s+SQLCODE\s*=\s*100\s+THEN', 'IF done = 1 THEN'),
            (r'IF\s+NOT\s+FOUND\s+THEN', 'IF done = 1 THEN'),
            (r'IF\s+SQLCODE\s*<>\s*0\s+THEN', 'IF done = 1 THEN')
        ]
        for pattern, replacement in patterns:
            sql = re.sub(pattern, replacement, sql, flags=re.IGNORECASE)
        return sql
    
    def convert(self) -> str:
        """
        Main conversion method orchestrating all transformations
        """
        # Remove SQL SECURITY INVOKER first
        sql = remove_sql_security_invoker(self.sql)
        sql, protected = _protect_string_literals(sql)
        converted = self.apply_patterns(sql, self.sp_head_patterns, section="SP_HEAD")
        converted = self.inject_cursor_handlers(converted)
        converted = self.convert_error_codes(converted)
        converted = self.convert_exception_handlers(converted)
        converted = self.convert_cursor_checks(converted)
        converted = self.apply_patterns(converted, self.sp_body_patterns, section="SP_BODY")
 #       converted = self.inject_default_exception_handler(converted)
        converted = self.add_done_handling(converted)
        converted = self.convert_teradata_error_code_handling(converted)
        if 'done = 1' in converted and 'DECLARE done INT' not in converted:
            self.warnings.append("Cursor end check detected but 'done' variable might be missing")
        final_sql = _restore_protected_strings(converted, protected)
        return final_sql   

    def get_unconverted_lines(self):
        """
        Return lines that were not converted by any pattern.
        """
        return self.unconverted_lines
        
    def get_conversion_warnings(self):
        """
        Return any warnings generated during conversion.
        """
        return self.warnings