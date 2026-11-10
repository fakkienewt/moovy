import os
from flask_cors import CORS

def setup_cors(app):
    origins = [o.strip() for o in os.getenv(
        'CORS_ORIGINS', 'http://localhost:4200,http://127.0.0.1:4200'
    ).split(',') if o.strip()]
    
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)