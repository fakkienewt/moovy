from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from DataBase.UpdateDB import db, Users

me_blueprint = Blueprint('me', __name__, url_prefix='/api')

@me_blueprint.route('/me', methods=['GET'])
@jwt_required()
def me():
    ident = get_jwt_identity()
    
    try:
        uid = int(ident)
    except (TypeError, ValueError):
        uid = None

    user = db.session.get(Users, uid) if uid else None
    
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

