from flask import Blueprint, request, jsonify
from sqlalchemy import func
from DataBase.UpdateDB import db
from Services.content_service import pick_database_tables, split_list

filter_blueprint = Blueprint('filter', __name__, url_prefix='/api')

@filter_blueprint.route('/filter-options', methods=['GET', 'OPTIONS'])
def get_filter_options():
    content_type = request.args.get('type', '')
    models = pick_database_tables(content_type)
    
    genres = set()
    years = set()
    countries = set()

    for table_data in models:
        model = table_data[0]
        
        for (value,) in db.session.query(func.lower(model.genres)).distinct().all():
            for item in split_list(value):
                item = item.strip()
                if item:
                    genres.add(item)

        for (value,) in db.session.query(func.lower(model.countries)).distinct().all():
            for item in split_list(value):
                item = item.strip()
                if item:
                    countries.add(item)

        for (value,) in db.session.query(model.year).distinct().all():
            if value:
                years.add(str(value))

    sorted_years = sorted(years, key=int, reverse=True)

    return jsonify({
        'genres': sorted(genres),
        'years': sorted_years,
        'countries': sorted(countries),
    })
    
@filter_blueprint.route('/suggestions', methods=['GET', 'OPTIONS'])
def suggestions_route():
    search_category = (request.args.get('search_category') or 'director').strip().lower()
    query = (request.args.get('q') or '').strip()
    
    try:
        limit = int(request.args.get('limit', 5))
    except (TypeError, ValueError):
        limit = 5

    if search_category not in ('director', 'actor') or not query:
        return jsonify([])

    content_type = request.args.get('type', '')
    
    return jsonify(get_suggestions(search_category, query, content_type, limit))


def get_suggestions(search_category, query, content_type, limit):
    if search_category == 'director':
        column_name = 'directors'
    else:
        column_name = 'actors'

    lowercase_query = query.lower()
    matches = set()

    models = pick_database_tables(content_type)

    for table_data in models:
        model = table_data[0]
        column = getattr(model, column_name)
        
        rows = (
            db.session.query(column)
            .filter(column.ilike(f'%{query}%'))
            .distinct()
            .limit(1000)
            .all()
        )

        for (value,) in rows:
            for item in split_list(value):
                item = item.strip()
                if item and lowercase_query in item.lower():
                    matches.add(item)

    return sorted(matches)[:limit]