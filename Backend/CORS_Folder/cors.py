import os
from flask_cors import CORS
from flask import request

def setup_cors(app):
    origins = [o.strip() for o in os.getenv(
        'CORS_ORIGINS', 'http://localhost:4200,http://127.0.0.1:4200'
    ).split(',') if o.strip()]
    
    CORS(app, resources={r"/api/*": {"origins": origins}})

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin and origin in origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = request.headers.get(
            'Access-Control-Request-Headers', 'Content-Type, Authorization'
        )
        response.headers['Access-Control-Max-Age'] = '86400'
        return response