from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from DataBase.UpdateDB import db, Users, EmailVerification
from Account.limiter import limiter

MAX_VERIFY_ATTEMPTS = 5

verify_blueprint = Blueprint('verify', __name__, url_prefix='/api')

@verify_blueprint.route('/verify', methods=['POST'])
@limiter.limit('10 per minute')
def verify():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    code = (data.get('code') or '').strip()

    if not code:
        return jsonify({'error': 'Введите код'}), 400
    
    if not email:
        return jsonify({"error": "Введите email"}), 400

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