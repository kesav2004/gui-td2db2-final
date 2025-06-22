import os
import subprocess
import tempfile
import uuid
from datetime import datetime
import shutil
from typing import Tuple, Dict, Any

class SQLConverterService:
    def __init__(self):
        self.converter_path = os.path.join(os.path.dirname(__file__), 'sql_converter')
        self.main_script = os.path.join(self.converter_path, 'main.py')
        
    def convert_sql(self, input_sql: str) -> Dict[str, Any]:
        """
        Convert Teradata SQL to DB2 SQL using the V8 converter tool
        
        Args:
            input_sql: The Teradata SQL code to convert
            
        Returns:
            Dictionary containing conversion results
        """
        try:
            # Generate unique filenames
            unique_id = str(uuid.uuid4())[:8]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Create temporary files
            temp_dir = tempfile.mkdtemp(prefix=f"sql_convert_{timestamp}_{unique_id}_")
            input_file = os.path.join(temp_dir, f"input_{unique_id}.sql")
            output_file = os.path.join(temp_dir, f"output_{unique_id}.sql")
            report_file = os.path.join(temp_dir, f"output_{unique_id}_report.sql")
            
            # Write input SQL to file
            with open(input_file, 'w', encoding='utf-8') as f:
                f.write(input_sql)
            
            # Run the conversion script
            cmd = [
                'python3', 
                self.main_script, 
                input_file, 
                output_file
            ]
            
            # Change to converter directory to ensure patterns file is found
            result = subprocess.run(
                cmd, 
                cwd=self.converter_path,
                capture_output=True, 
                text=True, 
                timeout=60  # 60 second timeout
            )
            
            # Prepare response
            response = {
                'success': result.returncode == 0,
                'timestamp': datetime.now().isoformat(),
                'conversion_id': unique_id,
                'input_sql': input_sql,
                'converted_sql': '',
                'conversion_report': '',
                'error_message': '',
                'warnings': []
            }
            
            # Read converted SQL if successful
            if result.returncode == 0 and os.path.exists(output_file):
                with open(output_file, 'r', encoding='utf-8') as f:
                    response['converted_sql'] = f.read()
                    
                # Read conversion report if it exists
                if os.path.exists(report_file):
                    with open(report_file, 'r', encoding='utf-8') as f:
                        response['conversion_report'] = f.read()
            else:
                response['error_message'] = result.stderr or "Conversion failed"
                
            # Include any stdout/stderr for debugging
            if result.stdout:
                response['stdout'] = result.stdout
            if result.stderr:
                response['stderr'] = result.stderr
                
            # Clean up temporary files
            try:
                shutil.rmtree(temp_dir)
            except Exception as cleanup_error:
                print(f"Warning: Could not clean up temp directory {temp_dir}: {cleanup_error}")
                
            return response
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error_message': 'Conversion timed out after 60 seconds',
                'timestamp': datetime.now().isoformat(),
                'conversion_id': None,
                'input_sql': input_sql,
                'converted_sql': '',
                'conversion_report': '',
                'warnings': ['Process timed out - input may be too complex']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': f"Conversion error: {str(e)}",
                'timestamp': datetime.now().isoformat(),
                'conversion_id': None,
                'input_sql': input_sql,
                'converted_sql': '',
                'conversion_report': '',
                'warnings': []
            }
    
    def validate_converter_setup(self) -> bool:
        """
        Validate that the converter is properly set up
        """
        try:
            # Check if main script exists
            if not os.path.exists(self.main_script):
                print(f"Main script not found: {self.main_script}")
                return False
                
            # Check if patterns file exists
            patterns_file = os.path.join(self.converter_path, 'patterns', 'sp_patterns.cfg')
            if not os.path.exists(patterns_file):
                print(f"Patterns file not found: {patterns_file}")
                return False
                
            # Check if converter modules exist
            converter_file = os.path.join(self.converter_path, 'sp_converter.py')
            if not os.path.exists(converter_file):
                print(f"Converter module not found: {converter_file}")
                return False
                
            return True
            
        except Exception as e:
            print(f"Validation error: {e}")
            return False
    
    def validate_sql_on_db2(self, converted_sql: str) -> Dict[str, Any]:
        """
        Validate converted SQL on remote DB2 server using Server_compiler
        
        Args:
            converted_sql: The converted DB2 SQL to validate
            
        Returns:
            Dictionary containing validation results
        """
        try:
            # Generate unique filenames for validation
            unique_id = str(uuid.uuid4())[:8]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Create temporary files
            temp_dir = tempfile.mkdtemp(prefix=f"sql_validate_{timestamp}_{unique_id}_")
            input_file = os.path.join(temp_dir, f"validate_input_{unique_id}.sql")
            output_file = os.path.join(temp_dir, f"validate_output_{unique_id}.txt")
            
            # Write converted SQL to file
            with open(input_file, 'w', encoding='utf-8') as f:
                f.write(converted_sql)
            
            # Run the validation using Server_compiler
            server_compiler_path = os.path.join(self.converter_path, 'Server_compiler.py')
            cmd = [
                'python3', 
                server_compiler_path, 
                input_file,
                output_file
            ]
            
            # Execute validation with timeout
            result = subprocess.run(
                cmd, 
                cwd=self.converter_path,
                capture_output=True, 
                text=True, 
                timeout=120  # 2 minute timeout for DB2 validation
            )
            
            # Prepare response
            response = {
                'success': result.returncode == 0,
                'timestamp': datetime.now().isoformat(),
                'validation_id': unique_id,
                'validation_output': '',
                'error_message': '',
                'db2_execution_success': False
            }
            
            # Read validation output if available
            if os.path.exists(output_file):
                with open(output_file, 'r', encoding='utf-8') as f:
                    response['validation_output'] = f.read()
            
            # Parse stdout for validation results
            if result.stdout:
                response['validation_output'] = result.stdout
                # Check for DB2 success indicator
                if "✅ DB2 execution successful." in result.stdout:
                    response['db2_execution_success'] = True
                elif "❌ DB2 reported a failure." in result.stdout:
                    response['db2_execution_success'] = False
                    response['error_message'] = "DB2 validation failed - see output for details"
            
            # Include stderr if there are errors
            if result.stderr:
                response['error_message'] = result.stderr
                
            # Clean up temporary files
            try:
                shutil.rmtree(temp_dir)
            except Exception as cleanup_error:
                print(f"Warning: Could not clean up temp directory {temp_dir}: {cleanup_error}")
                
            return response
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error_message': 'DB2 validation timed out after 2 minutes',
                'timestamp': datetime.now().isoformat(),
                'validation_id': None,
                'validation_output': '',
                'db2_execution_success': False
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': f"Validation error: {str(e)}",
                'timestamp': datetime.now().isoformat(),
                'validation_id': None,
                'validation_output': '',
                'db2_execution_success': False
            }

    def get_sample_sql(self) -> str:
        """
        Return a sample Teradata SQL for testing
        """
        return """REPLACE PROCEDURE TEST_SCHEMA.SAMPLE_PROC(IN par_ID INTEGER, OUT par_Status INTEGER)
BEGIN
    DECLARE par_COUNT INTEGER DEFAULT 0;
    DECLARE par_SQLSTATE CHARACTER(5);
    DECLARE cur_Sample CURSOR FOR SELECT ID FROM TEST_TABLE WHERE STATUS = 'ACTIVE';
    
    DECLARE EXIT HANDLER FOR SqlException
    BEGIN
        GET DIAGNOSTICS EXCEPTION 1 par_SQLSTATE = Message_Text;
        ROLLBACK;
        SET par_Status = 1;
    END;
    
    SELECT COUNT(*) INTO par_COUNT FROM TEST_TABLE WHERE ID = par_ID;
    
    IF par_COUNT > 0 THEN
        UPDATE TEST_TABLE 
        SET STATUS = 'PROCESSED', 
            UPDATED_DATE = Current_Timestamp
        WHERE ID = par_ID;
    END IF;
    
    SET par_Status = 0;
END;"""