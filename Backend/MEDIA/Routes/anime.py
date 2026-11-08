from flask import Blueprint, jsonify
from DataBase.UpdateDB import Anime

anime_blueprint = Blueprint('anime', __name__, url_prefix='/api')


@anime_blueprint.route('/anime', methods=['GET'])
def get_anime():
    items = Anime.query.all()
    
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