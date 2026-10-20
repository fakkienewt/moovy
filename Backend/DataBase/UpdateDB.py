import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URI', 'mysql+pymysql://root:1234@localhost/moovy_content_DB')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret')

db = SQLAlchemy(app)


class Movies(db.Model):
    __tablename__ = 'movies'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    genres = db.Column(db.Text, nullable=False)
    countries = db.Column(db.Text, nullable=False)
    actors = db.Column(db.Text, nullable=False)
    directors = db.Column(db.Text, nullable=False)
    time = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    poster = db.Column(db.String(500), nullable=False)
    rating = db.Column(db.String(10), nullable=False)
    page_url = db.Column(db.String(500), nullable=False)


class TvSeries(db.Model):
    __tablename__ = 'tv_series'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    genres = db.Column(db.Text, nullable=False)
    countries = db.Column(db.Text, nullable=False)
    actors = db.Column(db.Text, nullable=False)
    directors = db.Column(db.Text, nullable=False)
    time = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    poster = db.Column(db.String(500), nullable=False)
    rating = db.Column(db.String(10), nullable=False)
    page_url = db.Column(db.String(500), nullable=False)


class Anime(db.Model):
    __tablename__ = 'anime'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    genres = db.Column(db.Text, nullable=False)
    countries = db.Column(db.Text, nullable=False)
    actors = db.Column(db.Text, nullable=False)
    directors = db.Column(db.Text, nullable=False)
    time = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    poster = db.Column(db.String(500), nullable=False)
    rating = db.Column(db.String(10), nullable=False)
    page_url = db.Column(db.String(500), nullable=False)


class Users(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    nickname = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.String(500), nullable=True)
    watched = db.Column(db.Text, nullable=False, default='')
    favorites = db.Column(db.Text, nullable=False, default='')
    watch_later = db.Column(db.Text, nullable=False, default='')
    comments = db.Column(db.Text, nullable=False, default='[]')
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'nickname': self.nickname,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class EmailVerification(db.Model):
    __tablename__ = 'email_verification'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    username = db.Column(db.String(50), nullable=False)
    nickname = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Таблицы созданы")