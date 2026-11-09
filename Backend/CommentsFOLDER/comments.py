from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from DataBase.UpdateDB import db, Users
import json
import time

comments_blueprint = Blueprint('comments', __name__, url_prefix='/api/comments')

@comments_blueprint.route('/<string:content_key>', methods=['GET', 'OPTIONS'])
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
        except Exception as e:
            print(f"Ошибка парсинга JSON у юзера {user.id}: {e}")
            
    all_comments.sort(key=lambda x: x.get('date', 0), reverse=True)
    return jsonify(all_comments), 200

@comments_blueprint.route('/<string:content_key>', methods=['POST', 'OPTIONS'])
def add_comment(content_key):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    verify_jwt_in_request()
    identity_data = get_jwt_identity()
    user_id = int(identity_data)
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
        'date': int(time.time())
    }
    
    all_comments[content_key].append(new_comment)
    user.comments = json.dumps(all_comments)
    db.session.commit()
    
    new_comment['author'] = user.nickname
    new_comment['user_id'] = user.id
    new_comment['avatar'] = f"http://127.0.0.1:5001/api/profile/avatar/{user.id}" if user.avatar else None
    
    return jsonify(new_comment), 201

@comments_blueprint.route('/<string:content_key>/<string:comment_id>', methods=['DELETE', 'OPTIONS'])
def delete_comment(content_key, comment_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    verify_jwt_in_request()
    identity_data = get_jwt_identity()
    user_id = int(identity_data)
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

@comments_blueprint.route('/<string:content_key>/<string:comment_id>', methods=['PUT', 'OPTIONS'])
def edit_comment(content_key, comment_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    verify_jwt_in_request()
    identity_data = get_jwt_identity()
    user_id = int(identity_data)
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