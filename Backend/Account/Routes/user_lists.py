from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from DataBase.UpdateDB import db, Users

user_list_blueprint = Blueprint('user_list', __name__, url_prefix='/api')

def split_list(value):
    if not value:
        return []
    
    result = []
    
    for item in value.split(','):
        if item:
            result.append(item)
    return result


def switch_item(field: str, key: str):
    identity_data = get_jwt_identity()
    
    user_id = None
    try:
        user_id = int(identity_data)
    except (TypeError, ValueError):
        pass

    user = None
    if user_id:
        user = db.session.get(Users, user_id)

    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    if not key:
        return jsonify({'error': 'Неверный ключ'}), 400
        
    if ':' not in key:
        return jsonify({'error': 'Неверный ключ'}), 400

    current_value = getattr(user, field)
    
    if not current_value:
        current_value = ''

    items = []
    
    for item in current_value.split(','):
        if item:
            items.append(item)

    if key in items:
        items.remove(key)
        active = False
    else:
        items.append(key)
        active = True

    joined_items = ','.join(items)

    if field == 'watching_now':
        user.watching_now = joined_items
    elif field == 'watch_later':
        user.watch_later = joined_items
    elif field == 'watched':
        user.watched = joined_items
        
    db.session.commit()
    
    return jsonify({'active': active, 'items': items}), 200


@user_list_blueprint.route('/user_list', methods=['GET'])
@jwt_required()
def get_lists():
    identity_data = get_jwt_identity()
    
    user_id = None
    
    try:
        user_id = int(identity_data)
    except (TypeError, ValueError):
        pass

    user = None
    if user_id:
        user = db.session.get(Users, user_id)

    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    return jsonify({
        'watching_now': split_list(user.watching_now),
        'watch_later': split_list(user.watch_later),
        'watched': split_list(user.watched),
    }), 200


@user_list_blueprint.route('/watch-now/switch', methods=['POST'])
@jwt_required()
def switch_watch_now():
    data = request.get_json() or {}
    key = data.get('key')
    return switch_item('watching_now', key)


@user_list_blueprint.route('/watch-later/switch', methods=['POST'])
@jwt_required()
def switch_watch_later():
    data = request.get_json() or {}
    key = data.get('key')
    return switch_item('watch_later', key)


@user_list_blueprint.route('/watched/switch', methods=['POST'])
@jwt_required()
def switch_watched():
    data = request.get_json() or {}
    key = data.get('key')
    return switch_item('watched', key)