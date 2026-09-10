from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:1234@localhost/moovy_content_DB'
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


@app.route('/')
def hello():
    return 'Backend работает!'


@app.route('/api/movies')
def get_movies():
    items = Movies.query.all()
    result = [{
        'id': item.id, 'name': item.name, 'year': item.year,
        'poster': item.poster, 'genres': item.genres, 'countries': item.countries,
        'actors': item.actors, 'directors': item.directors, 'time': item.time,
        'description': item.description, 'rating': item.rating, 'page_url': item.page_url
    } for item in items]
    return jsonify(result)


@app.route('/api/tv-series')
def get_tv_series():
    items = TvSeries.query.all()
    result = [{
        'id': item.id, 'name': item.name, 'year': item.year,
        'poster': item.poster, 'genres': item.genres, 'countries': item.countries,
        'actors': item.actors, 'directors': item.directors, 'time': item.time,
        'description': item.description, 'rating': item.rating, 'page_url': item.page_url
    } for item in items]
    return jsonify(result)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)