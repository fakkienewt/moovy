import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from DataBase.UpdateDB import db, Users
from Account.limiter import limiter

username_blueprint = Blueprint('username', __name__, url_prefix='/api')

@username_blueprint.route('/profile/username', methods=['PATCH'])
@jwt_required()
@limiter.limit('10 per minute')
def update_username():
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
    username = (data.get('username') or '').strip()

    if not username:
        return jsonify({'error': 'Username не может быть пустым'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username слишком короткий (мин. 3)'}), 400
    if len(username) > 50:
        return jsonify({'error': 'Username слишком длинный (макс. 50)'}), 400
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return jsonify({'error': 'Username может содержать только буквы, цифры и _'}), 400

    if username != user.username:
        if Users.query.filter_by(username=username).first():
            return jsonify({'error': 'Этот username уже занят'}), 409

    user.username = username
    db.session.commit()

    return jsonify({'message': 'Username обновлён', 'user': user.to_dict()}), 200