import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from flask import jsonify
from DataBase.UpdateDB import db, app
from JWT_Folder.jwt import setup_jwt
from CORS_Folder.cors import setup_cors

setup_jwt(app)
setup_cors(app)

from Account.Routes.authorization import authorization_blueprint
from Account.Routes.login import login_blueprint
from Account.Routes.verify import verify_blueprint
from Account.Routes.me import me_blueprint
from Account.Routes.password import password_blueprint
from Account.Routes.nickname import nickname_blueprint
from Account.Routes.username import username_blueprint
from Account.Routes.avatar import avatar_blueprint
from Account.Routes.delete_account import delete_account_blueprint
from Account.Routes.user_lists import user_list_blueprint
from Account.Routes.profile_all import profile_all_blueprint
from Account.Routes.filter import filter_blueprint
from Account.Routes.pagination import pagination_blueprint
from MEDIA.Routes.movie import movies_blueprint
from MEDIA.Routes.tv_series import tv_series_blueprint
from MEDIA.Routes.anime import anime_blueprint
from MEDIA.Routes.player import player_blueprint

app.register_blueprint(authorization_blueprint)
app.register_blueprint(login_blueprint)
app.register_blueprint(verify_blueprint)
app.register_blueprint(me_blueprint)
app.register_blueprint(password_blueprint)
app.register_blueprint(nickname_blueprint)
app.register_blueprint(username_blueprint)
app.register_blueprint(avatar_blueprint)
app.register_blueprint(delete_account_blueprint)
app.register_blueprint(user_list_blueprint)
app.register_blueprint(profile_all_blueprint)
app.register_blueprint(filter_blueprint)
app.register_blueprint(pagination_blueprint)
app.register_blueprint(movies_blueprint)
app.register_blueprint(tv_series_blueprint)
app.register_blueprint(anime_blueprint)
app.register_blueprint(player_blueprint)

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Слишком много запросов. Попробуйте позже'}), 429

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=False, port=5001)