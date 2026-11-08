import os
from datetime import timedelta
from flask import jsonify
from flask_jwt_extended import JWTManager

jwt = JWTManager()

def setup_jwt(app):
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
        minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MIN', '1440'))
    )
    jwt.init_app(app)

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({'error': 'Требуется авторизация', 'reason': reason}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({'error': 'Неверный токен', 'reason': reason}), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({'error': 'Токен истёк'}), 401