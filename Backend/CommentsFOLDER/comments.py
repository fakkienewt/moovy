from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from DataBase.UpdateDB import db, Users, Movies, TvSeries, Anime
import json
import time

comments_blueprint = Blueprint('comments', __name__, url_prefix='/api/comments')

@comments_blueprint.route('/<path:content_key>', methods=['GET', 'OPTIONS'])
def get_comments(content_key):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    users = Users.query.all()
    all_comments = []
    
    for user in users:
        if not user.comments:
            continue
        try:
            user_comments = json.loads(user.comments)
            if isinstance(user_comments, dict) and content_key in user_comments:
                for c in user_comments[content_key]:
                    c['author'] = user.nickname
                    c['user_id'] = user.id
                    c['avatar'] = f"http://127.0.0.1:5001/api/profile/avatar/{user.id}" if user.avatar else None
                    all_comments.append(c)
        except Exception:
            pass
            
    all_comments.sort(key=lambda x: x.get('date', 0), reverse=True)
    
    for c in all_comments:
        c['likes_count'] = len(c.get('likes', []))
        c['dislikes_count'] = len(c.get('dislikes', []))
        
    return jsonify(all_comments), 200

@comments_blueprint.route('/user/<int:user_id>', methods=['GET', 'OPTIONS'])
def get_user_comments(user_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    user = db.session.get(Users, user_id)
    if not user or not user.comments:
        return jsonify([]), 200

    try:
        all_comments = json.loads(user.comments)
    except Exception:
        return jsonify([]), 200

    result = []
    if isinstance(all_comments, dict):
        for content_key, comments_list in all_comments.items():
            try:
                type_key, id_str = content_key.split(':')
                item_id = int(id_str)
                
                model = Movies
                if type_key == 'tv-series':
                    model = TvSeries
                elif type_key == 'anime':
                    model = Anime
                
                content = db.session.get(model, item_id)
                movie_name = content.name if content else 'Фильм удален'
                movie_year = content.year if content else ''
            except Exception:
                movie_name = 'Фильм удален'
                movie_year = ''

            for c in comments_list:
                c['content_key'] = content_key
                c['movie_name'] = movie_name
                c['movie_year'] = movie_year
                c['likes_count'] = len(c.get('likes', []))
                c['dislikes_count'] = len(c.get('dislikes', []))
                result.append(c)
                
    result.sort(key=lambda x: x.get('date', 0), reverse=True)
    
    for c in result:
        c['avatar'] = f"http://127.0.0.1:5001/api/profile/avatar/{user.id}" if user.avatar else None
        c['author'] = user.nickname
        
    return jsonify(result), 200

@comments_blueprint.route('/<path:content_key>', methods=['POST', 'OPTIONS'])
def add_comment(content_key):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    verify_jwt_in_request()
    user_id = int(get_jwt_identity())
    user = db.session.get(Users, user_id)
    
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
        
    data = request.get_json() or {}
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'Комментарий пуст'}), 400

    try:
        all_comments = json.loads(user.comments)
        if not isinstance(all_comments, dict):
            all_comments = {}
    except Exception:
        all_comments = {}

    if content_key not in all_comments:
        all_comments[content_key] = []

    new_comment = {
        'id': str(int(time.time() * 1000)),
        'text': text,
        'date': int(time.time()),
        'likes': [],
        'dislikes': []
    }
    
    all_comments[content_key].append(new_comment)
    user.comments = json.dumps(all_comments)
    db.session.commit()
    
    new_comment['author'] = user.nickname
    new_comment['user_id'] = user.id
    new_comment['avatar'] = f"http://127.0.0.1:5001/api/profile/avatar/{user.id}" if user.avatar else None
    new_comment['likes_count'] = 0
    new_comment['dislikes_count'] = 0
    
    return jsonify(new_comment), 201

@comments_blueprint.route('/<path:content_key>/<string:comment_id>', methods=['DELETE', 'OPTIONS'])
def delete_comment(content_key, comment_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    verify_jwt_in_request()
    user_id = int(get_jwt_identity())
    user = db.session.get(Users, user_id)
    
    if not user or not user.comments:
        return jsonify({'error': 'Пользователь не найден'}), 404
        
    try:
        all_comments = json.loads(user.comments)
        if not isinstance(all_comments, dict):
            all_comments = {}
    except Exception:
        all_comments = {}

    if content_key in all_comments:
        all_comments[content_key] = [c for c in all_comments[content_key] if c.get('id') != comment_id]
        user.comments = json.dumps(all_comments)
        db.session.commit()
        return jsonify({'message': 'Удалено'}), 200
        
    return jsonify({'error': 'Комментарий не найден'}), 404

@comments_blueprint.route('/<path:content_key>/<string:comment_id>', methods=['PUT', 'OPTIONS'])
def edit_comment(content_key, comment_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    verify_jwt_in_request()
    user_id = int(get_jwt_identity())
    user = db.session.get(Users, user_id)
    
    if not user or not user.comments:
        return jsonify({'error': 'Пользователь не найден'}), 404

    data = request.get_json() or {}
    new_text = (data.get('text') or '').strip()
    
    if not new_text:
        return jsonify({'error': 'Текст пуст'}), 400

    try:
        all_comments = json.loads(user.comments)
        if not isinstance(all_comments, dict):
            all_comments = {}
    except Exception:
        all_comments = {}

    if content_key in all_comments:
        for c in all_comments[content_key]:
            if c.get('id') == comment_id:
                c['text'] = new_text
                user.comments = json.dumps(all_comments)
                db.session.commit()
                return jsonify({'message': 'Обновлено', 'text': new_text}), 200

    return jsonify({'error': 'Комментарий не найден'}), 404

@comments_blueprint.route('/<path:content_key>/<string:comment_id>/vote', methods=['POST', 'OPTIONS'])
def vote_comment(content_key, comment_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    verify_jwt_in_request()
    voter_id = int(get_jwt_identity())
    
    data = request.get_json() or {}
    vote_type = data.get('vote_type')
    
    if vote_type not in ('like', 'dislike'):
        return jsonify({'error': 'Неверный тип голоса'}), 400

    users = Users.query.all()
    
    for author in users:
        if not author.comments:
            continue
        try:
            all_comments = json.loads(author.comments)
            if not isinstance(all_comments, dict) or content_key not in all_comments:
                continue
                
            for c in all_comments[content_key]:
                if c.get('id') == comment_id:
                    likes = c.get('likes', [])
                    dislikes = c.get('dislikes', [])

                    if vote_type == 'like':
                        if voter_id in likes:
                            likes.remove(voter_id)
                        else:
                            likes.append(voter_id)
                            if voter_id in dislikes:
                                dislikes.remove(voter_id)
                                
                    elif vote_type == 'dislike':
                        if voter_id in dislikes:
                            dislikes.remove(voter_id)
                        else:
                            dislikes.append(voter_id)
                            if voter_id in likes:
                                likes.remove(voter_id)
                    
                    c['likes'] = likes
                    c['dislikes'] = dislikes
                    
                    author.comments = json.dumps(all_comments)
                    db.session.commit()
                    
                    return jsonify({
                        'likes_count': len(likes),
                        'dislikes_count': len(dislikes),
                        'user_vote': vote_type if voter_id in (likes if vote_type == 'like' else dislikes) else None
                    }), 200
        except Exception:
            continue
            
    return jsonify({'error': 'Комментарий не найден'}), 404