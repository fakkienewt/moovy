import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:1234@localhost/moovy_content_DB'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
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