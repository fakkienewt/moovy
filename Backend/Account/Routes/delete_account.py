from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from DataBase.UpdateDB import db, Users

delete_account_blueprint = Blueprint('delete_account', __name__, url_prefix='/api')

@delete_account_blueprint.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
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

    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Аккаунт удалён'}), 200