from flask import Blueprint, jsonify
from DataBase.UpdateDB import Movies

movies_blueprint = Blueprint('movies', __name__, url_prefix='/api')

@movies_blueprint.route('/movies', methods=['GET'])
def get_movies():
    items = Movies.query.all()
    
    result = []
    for item in items:
        result.append({
            'id': item.id,
            'name': item.name,
            'year': item.year,
            'poster': item.poster,
            'genres': item.genres,
            'countries': item.countries,
            'actors': item.actors,
            'directors': item.directors,
            'time': item.time,
            'description': item.description,
            'rating': item.rating,
            'page_url': item.page_url
        })
        
    return jsonify(result)