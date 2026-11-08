from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from DataBase.UpdateDB import db, Users
from Account.limiter import limiter

nickname_blueprint = Blueprint('nickname', __name__, url_prefix='/api')

@nickname_blueprint.route('/profile/nickname', methods=['PATCH'])
@jwt_required()
@limiter.limit('20 per minute')
def update_nickname():
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
    nickname = (data.get('nickname') or '').strip()

    if not nickname:
        return jsonify({'error': 'Ник не может быть пустым'}), 400
    if len(nickname) > 100:
        return jsonify({'error': 'Ник слишком длинный (макс. 100)'}), 400
    if len(nickname) < 2:
        return jsonify({'error': 'Ник слишком короткий (мин. 2)'}), 400

    user.nickname = nickname
    db.session.commit()

    return jsonify({'message': 'Ник обновлён', 'user': user.to_dict()}), 200