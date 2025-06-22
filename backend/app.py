from flask import Flask
from flask_cors import CORS
from data_validation.routes import bp as data_validation_bp
from sql_conversion_routes import bp as sql_conversion_bp
from flask import send_from_directory

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.register_blueprint(data_validation_bp, url_prefix='/api')
app.register_blueprint(sql_conversion_bp, url_prefix='/api/sql-conversion')

@app.route('/runs/<path:filename>')
def serve_report(filename):
    return send_from_directory("runs", filename)

if __name__ == '__main__':
    app.run(debug=True, port=5001)

