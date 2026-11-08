from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from DataBase.UpdateDB import db, Users, Movies, TvSeries, Anime

profile_all_blueprint = Blueprint('profile_all', __name__, url_prefix='/api')

def split_list(value):
    if not value:
        return []
    
    result = []
    
    for item in value.split(','):
        if item:
            result.append(item)
    return result

def get_content_details(keys):
    grouped = {'movies': [], 'tv-series': [], 'anime': []}
    
    for key in keys:
        if ':' not in key:
            continue
        
        parts = key.split(':', 1)
        type_key = parts[0]
        id_str = parts[1]
        
        if not id_str.isdigit():
            continue
        category = type_key
        
        if type_key == 'movies':
            category = 'movies'
            
        if category in grouped:
            grouped[category].append(int(id_str))

    result = []
    
    for category, ids in grouped.items():
        if not ids:
            continue
        if category == 'movies':
            model = Movies
        elif category == 'tv-series':
            model = TvSeries
        else:
            model = Anime
            
        rows = model.query.filter(model.id.in_(ids)).all()
        
        type_name = category
        if category == 'movies':
            type_name = 'movie'
        
        for row in rows:
            result.append({
                'id': row.id, 'name': row.name, 'year': row.year, 
                'poster': row.poster, 'rating': row.rating, 'type': type_name
            })
    return result


@profile_all_blueprint.route('/profile', methods=['GET'])
@jwt_required()
def get_profile_data():
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

    watching_now = split_list(user.watching_now)
    watch_later = split_list(user.watch_later)
    watched = split_list(user.watched)
    
    all_keys = []
    
    for key in watching_now:
        if key not in all_keys:
            all_keys.append(key)

    for key in watch_later:
        if key not in all_keys:
            all_keys.append(key)

    for key in watched:
        if key not in all_keys:
            all_keys.append(key)
    
    content = get_content_details(all_keys)

    return jsonify({
        'content': content,
        'state': {
            'watching_now': watching_now,
            'watch_later': watch_later,
            'watched': watched,
        }
    }), 200