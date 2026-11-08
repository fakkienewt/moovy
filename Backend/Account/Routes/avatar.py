from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from DataBase.UpdateDB import db, Users

avatar_blueprint = Blueprint('avatar', __name__, url_prefix='/api')

@avatar_blueprint.route('/profile/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
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

    if 'avatar' not in request.files:
        return jsonify({'error': 'Файл не найден'}), 400

    file = request.files['avatar']
    
    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': 'Неверный формат файла'}), 400

    user.avatar = file.read()
    db.session.commit()

    return jsonify({'message': 'Аватар обновлён', 'user': user.to_dict()}), 200


@avatar_blueprint.route('/profile/avatar/<int:user_id>', methods=['GET'])
def get_avatar(user_id):
    user = db.session.get(Users, user_id)
    
    if not user:
        return jsonify({'error': 'Юзер не найден'}), 404

    if not user.avatar:
        return jsonify({'error': 'Аватар не найден'}), 404
    
    return Response(user.avatar, mimetype='image/jpeg')