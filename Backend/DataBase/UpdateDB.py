from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:1234@localhost/moovy_content_DB'
db = SQLAlchemy(app)

class MovieNewItems(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255)) 
    year = db.Column(db.Integer)  
    genres = db.Column(db.Text)  
    countries = db.Column(db.Text)
    actors = db.Column(db.Text)
    directors = db.Column(db.Text)
    time = db.Column(db.String(50)) 
    description = db.Column(db.Text)
    poster = db.Column(db.String(500))
    rating = db.Column(db.String(10))  
    page_url = db.Column(db.String(500)) 

@app.route('/')
def hello():
    return 'Backend работает!'

@app.route('/api/new-items')
def get_new_items():
    items = MovieNewItems.query.all()
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