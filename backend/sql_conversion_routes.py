from flask import Blueprint, request, jsonify
from sql_converter_service import SQLConverterService
import logging

# Create blueprint for SQL conversion routes
bp = Blueprint('sql_conversion', __name__)

# Initialize the converter service
converter_service = SQLConverterService()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@bp.route('/convert', methods=['POST'])
def convert_sql():
    """
    Convert Teradata SQL to DB2 SQL
    
    Expected JSON payload:
    {
        "input_sql": "REPLACE PROCEDURE ... END;"
    }
    
    Returns:
    {
        "success": true/false,
        "converted_sql": "CREATE OR REPLACE PROCEDURE ... END@",
        "conversion_report": "Conversion Report - ...",
        "error_message": "",
        "timestamp": "2024-01-01T12:00:00",
        "conversion_id": "abc123def"
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error_message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        
        # Validate input
        if 'input_sql' not in data:
            return jsonify({
                'success': False,
                'error_message': 'Missing required field: input_sql'
            }), 400
        
        input_sql = data['input_sql'].strip()
        
        if not input_sql:
            return jsonify({
                'success': False,
                'error_message': 'input_sql cannot be empty'
            }), 400
        
        logger.info(f"Starting SQL conversion, input length: {len(input_sql)}")
        
        # Perform conversion
        result = converter_service.convert_sql(input_sql)
        
        # Log result
        if result['success']:
            logger.info(f"Conversion successful, ID: {result['conversion_id']}")
        else:
            logger.error(f"Conversion failed: {result['error_message']}")
        
        # Return appropriate status code
        status_code = 200 if result['success'] else 400
        
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Unexpected error in convert_sql: {str(e)}")
        return jsonify({
            'success': False,
            'error_message': f'Server error: {str(e)}',
            'timestamp': None,
            'conversion_id': None,
            'input_sql': '',
            'converted_sql': '',
            'conversion_report': '',
            'warnings': []
        }), 500

@bp.route('/sample', methods=['GET'])
def get_sample_sql():
    """
    Get a sample Teradata SQL for testing
    
    Returns:
    {
        "sample_sql": "REPLACE PROCEDURE ... END;"
    }
    """
    try:
        sample_sql = converter_service.get_sample_sql()
        return jsonify({
            'success': True,
            'sample_sql': sample_sql
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting sample SQL: {str(e)}")
        return jsonify({
            'success': False,
            'error_message': f'Error getting sample: {str(e)}',
            'sample_sql': ''
        }), 500

@bp.route('/validate', methods=['GET'])
def validate_converter():
    """
    Validate that the SQL converter is properly configured
    
    Returns:
    {
        "success": true/false,
        "message": "Converter is ready" or error details
    }
    """
    try:
        is_valid = converter_service.validate_converter_setup()
        
        if is_valid:
            return jsonify({
                'success': True,
                'message': 'SQL Converter is properly configured and ready'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'SQL Converter setup validation failed. Check server logs.'
            }), 500
            
    except Exception as e:
        logger.error(f"Error validating converter: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Validation error: {str(e)}'
        }), 500

@bp.route('/validate', methods=['POST'])
def validate_sql():
    """
    Validate converted SQL on remote DB2 server
    
    Expected JSON payload:
    {
        "converted_sql": "CREATE OR REPLACE PROCEDURE ... END@"
    }
    
    Returns:
    {
        "success": true/false,
        "validation_output": "DB2 execution results...",
        "db2_execution_success": true/false,
        "error_message": "",
        "timestamp": "2024-01-01T12:00:00",
        "validation_id": "abc123def"
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error_message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        
        # Validate input
        if 'converted_sql' not in data:
            return jsonify({
                'success': False,
                'error_message': 'Missing required field: converted_sql'
            }), 400
        
        converted_sql = data['converted_sql'].strip()
        
        if not converted_sql:
            return jsonify({
                'success': False,
                'error_message': 'converted_sql cannot be empty'
            }), 400
        
        logger.info(f"Starting DB2 validation, SQL length: {len(converted_sql)}")
        
        # Perform validation
        result = converter_service.validate_sql_on_db2(converted_sql)
        
        # Log result
        if result['success'] and result['db2_execution_success']:
            logger.info(f"DB2 validation successful, ID: {result['validation_id']}")
        else:
            logger.error(f"DB2 validation failed: {result['error_message']}")
        
        # Return appropriate status code
        status_code = 200 if result['success'] else 400
        
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Unexpected error in validate_sql: {str(e)}")
        return jsonify({
            'success': False,
            'error_message': f'Server error: {str(e)}',
            'timestamp': None,
            'validation_id': None,
            'validation_output': '',
            'db2_execution_success': False
        }), 500

@bp.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint
    """
    return jsonify({
        'success': True,
        'message': 'SQL Conversion service is running',
        'service': 'sql_conversion'
    }), 200