import re
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from DataBase.UpdateDB import db, Users, EmailVerification
from DataBase.mailer import generate_code, send_verification_code
from Account.limiter import limiter

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
authorization_blueprint = Blueprint('authorization', __name__, url_prefix='/api')

@authorization_blueprint.route('/register', methods=['POST'])
@limiter.limit('5 per minute')
@limiter.limit('20 per hour')
def auth():
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