from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from DataBase.UpdateDB import db, Users
from Account.limiter import limiter

password_blueprint = Blueprint('password', __name__, url_prefix='/api')

@password_blueprint.route('/profile/password', methods=['PATCH'])
@jwt_required()
@limiter.limit('5 per minute')
def update_password():
    ident = get_jwt_identity()
    
    try:
        uid = int(ident)
    except (TypeError, ValueError):
        uid = None

    user = None
    
    if uid:
        user = db.session.get(Users, uid)

    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    data = request.get_json() or {}
    old_password = data.get('old_password') or ''
    new_password = data.get('new_password') or ''

    if not old_password or not new_password:
        return jsonify({'error': 'Заполните оба поля'}), 400

    if not check_password_hash(user.password_hash, old_password):
        return jsonify({'error': 'Неверный старый пароль'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Новый пароль должен быть минимум 8 символов'}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({'message': 'Пароль успешно изменён'}), 200