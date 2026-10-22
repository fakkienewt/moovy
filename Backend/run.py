import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re
from datetime import datetime, timedelta, timezone
from DataBase.UpdateDB import (
    db, Movies, TvSeries, Anime, Users, EmailVerification, app
)
from DataBase.mailer import generate_code, send_verification_code

origins = [o.strip() for o in os.getenv(
    'CORS_ORIGINS', 'http://localhost:4200,http://127.0.0.1:4200'
).split(',') if o.strip()]
CORS(app, resources={r"/api/*": {"origins": origins}})

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
    minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MIN', '1440'))
)
jwt = JWTManager(app)

limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[],
    storage_uri='memory://',
)

HEADERS_BASKINO = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    'Referer': 'https://baskino.my/',
    'Origin': 'https://baskino.my'
}

HEADERS_KINOBAR = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9',
    'Referer': 'https://tv.kinobar.im/',
    'Origin': 'https://tv.kinobar.im'
}

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
MAX_VERIFY_ATTEMPTS = 5

def _split(value):
    return [x for x in (value or '').split(',') if x]

def _content_to_dict(item, type_name):
    return {
        'id': item.id, 'name': item.name, 'year': item.year, 'poster': item.poster,
        'rating': item.rating, 'type': type_name
    }

_TYPE_MODEL = {
    'movies': Movies,
    'movie': Movies,
    'tv-series': TvSeries,
    'anime': Anime,
}

def _resolve_keys(keys):
    grouped = {'movies': [], 'tv-series': [], 'anime': []}
    for k in keys:
        if ':' not in k:
            continue
        type_key, id_str = k.split(':', 1)
        if not id_str.isdigit():
            continue
        bucket = 'movies' if type_key == 'movies' else type_key
        if bucket in grouped:
            grouped[bucket].append(int(id_str))

    result = []
    for bucket, ids in grouped.items():
        if not ids:
            continue
        model = _TYPE_MODEL[bucket]
        rows = model.query.filter(model.id.in_(ids)).all()
        type_name = 'movie' if bucket == 'movies' else bucket
        for r in rows:
            result.append(_content_to_dict(r, type_name))
    return result


def _current_user_id():
    ident = get_jwt_identity()
    try:
        return int(ident)
    except (TypeError, ValueError):
        return None


@app.route('/api/movies')
def get_movies():
    items = Movies.query.all()
    return jsonify([{
        'id': i.id, 'name': i.name, 'year': i.year, 'poster': i.poster,
        'genres': i.genres, 'countries': i.countries, 'actors': i.actors,
        'directors': i.directors, 'time': i.time, 'description': i.description,
        'rating': i.rating, 'page_url': i.page_url
    } for i in items])


@app.route('/api/tv-series')
def get_tv_series():
    items = TvSeries.query.all()
    return jsonify([{
        'id': i.id, 'name': i.name, 'year': i.year, 'poster': i.poster,
        'genres': i.genres, 'countries': i.countries, 'actors': i.actors,
        'directors': i.directors, 'time': i.time, 'description': i.description,
        'rating': i.rating, 'page_url': i.page_url
    } for i in items])


@app.route('/api/anime')
def get_anime():
    items = Anime.query.all()
    return jsonify([{
        'id': i.id, 'name': i.name, 'year': i.year, 'poster': i.poster,
        'genres': i.genres, 'countries': i.countries, 'actors': i.actors,
        'directors': i.directors, 'time': i.time, 'description': i.description,
        'rating': i.rating, 'page_url': i.page_url
    } for i in items])


@app.route('/api/get-iframe/<int:content_id>')
def get_iframe(content_id):
    source = request.args.get('source', 'movies')
    content_item = None

    if source == 'tv-series':
        content_item = db.session.get(TvSeries, content_id)
    elif source == 'anime':
        content_item = db.session.get(Anime, content_id)
    else:
        content_item = db.session.get(Movies, content_id)

    if not content_item:
        if source == 'tv-series':
            content_item = db.session.get(Movies, content_id) or db.session.get(Anime, content_id)
        elif source == 'anime':
            content_item = db.session.get(Movies, content_id) or db.session.get(TvSeries, content_id)
        else:
            content_item = db.session.get(TvSeries, content_id) or db.session.get(Anime, content_id)

    if not content_item or not content_item.page_url:
        return jsonify({'error': f'Content {content_id} not found'}), 404

    try:
        headers = HEADERS_KINOBAR if 'kinobar' in content_item.page_url else HEADERS_BASKINO
        resp = requests.get(content_item.page_url, headers=headers, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')
        players = []

        panels = soup.find('div', class_='panels')
        if panels:
            for iframe in panels.find_all('iframe'):
                src = iframe.get('src') or iframe.get('data-src')
                if src and 'youtube' not in src.lower():
                    if src.startswith('//'):
                        src = 'https:' + src
                    elif src.startswith('/'):
                        src = urljoin(content_item.page_url, src)
                    players.append(src)

        if not players:
            boxes = soup.find_all('div', class_='box')
            for box in boxes:
                iframe = box.find('iframe')
                if iframe:
                    src = iframe.get('src') or iframe.get('data-src')
                    if src and 'youtube' not in src.lower() and 'fotpro' not in src.lower():
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            src = urljoin(content_item.page_url, src)
                        players.append(src)

            if not players:
                udvb = soup.find('div', class_='udvb-container')
                if udvb:
                    iframe = udvb.find('iframe')
                    if iframe:
                        src = iframe.get('src')
                        if src and 'fotpro' not in src.lower():
                            players.append(src)

        if players:
            return jsonify({
                'players': players,
                'primary_player': players[0],
                'content_name': content_item.name,
                'source': source
            })
        return jsonify({'error': 'No valid players found on page'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/register', methods=['POST'])
@limiter.limit('5 per minute')
@limiter.limit('20 per hour')
def register():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    nickname = (data.get('nickname') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not all([username, nickname, email, password]):
        return jsonify({'error': 'Заполните все поля'}), 400

    if not EMAIL_RE.match(email):
        return jsonify({'error': 'Неверный формат email'}), 400

    if len(password) < 8:
        return jsonify({'error': 'Пароль минимум 8 символов'}), 400

    if Users.query.filter_by(email=email).first():
        return jsonify({'error': 'Email уже зарегистрирован'}), 409

    if Users.query.filter_by(username=username).first():
        return jsonify({'error': 'Имя пользователя занято'}), 409

    code = generate_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    EmailVerification.query.filter_by(email=email).delete()

    ev = EmailVerification(
        email=email,
        username=username,
        nickname=nickname,
        password_hash=generate_password_hash(password),
        code=code,
        attempts=0,
        expires_at=expires,
    )
    db.session.add(ev)
    db.session.commit()

    if not send_verification_code(email, code):
        return jsonify({'error': 'Не удалось отправить письмо'}), 500

    return jsonify({'message': 'Код отправлен на email'}), 200


@app.route('/api/verify', methods=['POST'])
@limiter.limit('10 per minute')
def verify():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    code = (data.get('code') or '').strip()

    if not email or not code:
        return jsonify({'error': 'Введите код'}), 400

    ev = EmailVerification.query.filter_by(email=email).first()
    if not ev:
        return jsonify({'error': 'Запрос не найден, зарегистрируйтесь заново'}), 404

    if ev.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.session.delete(ev)
        db.session.commit()
        return jsonify({'error': 'Код истёк'}), 410

    if ev.code != code:
        ev.attempts = (ev.attempts or 0) + 1
        if ev.attempts >= MAX_VERIFY_ATTEMPTS:
            db.session.delete(ev)
            db.session.commit()
            return jsonify({'error': 'Слишком много попыток. Зарегистрируйтесь заново'}), 429
        db.session.commit()
        return jsonify({'error': 'Неверный код'}), 400

    if Users.query.filter_by(email=email).first():
        return jsonify({'error': 'Email уже зарегистрирован'}), 409

    user = Users(
        nickname=ev.nickname,
        username=ev.username,
        email=ev.email,
        password_hash=ev.password_hash
    )
    db.session.add(user)
    db.session.delete(ev)
    db.session.commit()

    token = create_access_token(identity=str(user.id))

    return jsonify({
        'message': 'Регистрация успешна',
        'access_token': token,
        'user': user.to_dict(),
    }), 201


@app.route('/api/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Введите email и пароль'}), 400

    user = Users.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Аккаунт с такой почтой не найден'}), 404

    if not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Неверный пароль'}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        'message': 'Вход выполнен',
        'access_token': token,
        'user': user.to_dict(),
    }), 200


@app.route('/api/me', methods=['GET'])
@jwt_required()
def me():
    uid = _current_user_id()
    user = db.session.get(Users, uid) if uid else None
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    return jsonify({'user': user.to_dict()}), 200


@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile_data():
    uid = _current_user_id()
    user = db.session.get(Users, uid) if uid else None
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    fav = _split(user.favorites)
    wl = _split(user.watch_later)
    watch = _split(user.watched)
    all_keys = list({*fav, *wl, *watch})
    content = _resolve_keys(all_keys)

    return jsonify({
        'content': content,
        'state': {
            'favorites': fav,
            'watch_later': wl,
            'watched': watch,
        }
    }), 200


@app.route('/api/user-state', methods=['GET'])
@jwt_required()
def get_user_state():
    uid = _current_user_id()
    user = db.session.get(Users, uid) if uid else None
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    return jsonify({
        'favorites': _split(user.favorites),
        'watch_later': _split(user.watch_later),
        'watched': _split(user.watched),
    }), 200


def _toggle_field(field: str, key: str):
    uid = _current_user_id()
    user = db.session.get(Users, uid) if uid else None
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    if not key or ':' not in key:
        return jsonify({'error': 'Неверный ключ'}), 400

    current = getattr(user, field) or ''
    items = [x for x in current.split(',') if x.strip()]

    if key in items:
        items.remove(key)
        active = False
    else:
        items.append(key)
        active = True

    setattr(user, field, ','.join(items))
    db.session.commit()
    return jsonify({'active': active, 'items': items}), 200


@app.route('/api/favorites/toggle', methods=['POST'])
@jwt_required()
def toggle_favorite():
    data = request.get_json() or {}
    return _toggle_field('favorites', data.get('key'))


@app.route('/api/watch-later/toggle', methods=['POST'])
@jwt_required()
def toggle_later():
    data = request.get_json() or {}
    return _toggle_field('watch_later', data.get('key'))


@app.route('/api/watched/toggle', methods=['POST'])
@jwt_required()
def toggle_watched():
    data = request.get_json() or {}
    return _toggle_field('watched', data.get('key'))


@app.route('/api/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    uid = _current_user_id()
    user = db.session.get(Users, uid) if uid else None
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Аккаунт удалён'}), 200


@app.route('/api/profile/nickname', methods=['PATCH'])
@jwt_required()
@limiter.limit('20 per minute')
def update_nickname():
    uid = _current_user_id()
    user = db.session.get(Users, uid) if uid else None
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


@app.route('/api/profile/username', methods=['PATCH'])
@jwt_required()
@limiter.limit('10 per minute')
def update_username():
    uid = _current_user_id()
    user = db.session.get(Users, uid) if uid else None
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


@jwt.unauthorized_loader
def missing_token(reason):
    return jsonify({'error': 'Требуется авторизация', 'reason': reason}), 401


@jwt.invalid_token_loader
def invalid_token(reason):
    return jsonify({'error': 'Неверный токен', 'reason': reason}), 401


@jwt.expired_token_loader
def expired_token(jwt_header, jwt_payload):
    return jsonify({'error': 'Токен истёк'}), 401


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Слишком много запросов. Попробуйте позже'}), 429


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=False, port=5001)