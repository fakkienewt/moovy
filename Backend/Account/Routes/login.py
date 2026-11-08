from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash
from Account.limiter import limiter
from DataBase.UpdateDB import Users

login_blueprint = Blueprint('login', __name__, url_prefix='/api')

@login_blueprint.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email:
        return jsonify({'error': 'Введите email'}), 400
    
    if not password:
        return jsonify({"error": "Введите пароль"}), 400

    user = Users.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Аккаунт с такой почтой не найден'}), 404

    if not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Неверный пароль'}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        'message': 'Вход выполнен',
        'access_token': token,
        'user': user.to_dict(),
    }), 200