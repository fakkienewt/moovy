from sqlalchemy import func, literal, cast, Float
from DataBase.UpdateDB import db, Movies, TvSeries, Anime

_TYPE_MODEL = {
    'movie': Movies,
    'tv-series': TvSeries,
    'anime': Anime,
}

_CONTENT_MODELS = (
    (Movies, 'movie'),
    (TvSeries, 'tv-series'),
    (Anime, 'anime'),
)

_ALL_COLUMNS = (
    'id', 'name', 'year', 'genres', 'countries', 'actors', 'directors',
    'time', 'description', 'poster', 'rating', 'page_url',
)

def _parse_pagination_number(value, default, maximum=None):
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default
        
    if result < 1:
        result = default
        
    if maximum is not None:
        result = min(result, maximum)
        
    return result


def pick_database_tables(content_type):
    key = (content_type or '').strip().lower()
    
    if not key or key == 'all':
        return list(_CONTENT_MODELS)
    
    model = _TYPE_MODEL.get(key)
    
    if not model:
        return list(_CONTENT_MODELS)
    
    for model_info in _CONTENT_MODELS:
        current_model = model_info[0]
        current_name = model_info[1]
        
        if current_model is model:
            return [(model, current_name)]
            
    return list(_CONTENT_MODELS)


def _content_filters(model, args):
    filters = []
    
    genre = (args.get('genre') or '').strip()
    
    if genre:
        filters.append(model.genres.ilike(f'%{genre}%'))
        
    country = (args.get('country') or '').strip()

    if country:
        filters.append(model.countries.ilike(f'%{country}%'))
        
    director = (args.get('director') or '').strip()
    
    if director:
        filters.append(model.directors.ilike(f'%{director}%'))
        
    actor = (args.get('actor') or '').strip()
    
    if actor:
        filters.append(model.actors.ilike(f'%{actor}%'))
        
    search = (args.get('search') or '').strip()
    
    if search:
        filters.append(model.name.ilike(f'%{search}%'))
        
    year = (args.get('year') or '').strip()
    
    if year.isdigit():
        filters.append(model.year == int(year))
        
    return filters


def _convert_content_to_dict(row):
    data = {'type': row.type}
    
    data['id'] = row.id
    data['name'] = row.name
    data['year'] = row.year
    data['genres'] = row.genres
    data['countries'] = row.countries
    data['actors'] = row.actors
    data['directors'] = row.directors
    data['time'] = row.time
    data['description'] = row.description
    data['poster'] = row.poster
    data['rating'] = row.rating
    data['page_url'] = row.page_url
    
    return data

def get_paginated_content(args):
    models = pick_database_tables(args.get('type'))
    page = _parse_pagination_number(args.get('page'), 1)
    limit = _parse_pagination_number(args.get('limit'), 16, 16)
    sort_type = (args.get('sort') or 'default').strip().lower()
    rating_sort = sort_type in ('rating_asc', 'rating_desc')

    selects = []
    table_index = 0 

    for table_data in models:
        model = table_data[0]
        type_name = table_data[1]
        
        columns = []
        
        for column in _ALL_COLUMNS:
            columns.append(getattr(model, column).label(column))
            
        if rating_sort:
            columns.append(cast(model.rating, Float).label('rating_num'))
            
        query = db.session.query(
            *columns, 
            literal(type_name).label('type'), 
            literal(table_index).label('content_type_position')
        ).filter(*_content_filters(model, args))
        
        selects.append(query)
        table_index += 1

    if len(selects) == 1:
        content_subquery = selects[0].subquery()
    else:
        first_select = selects[0]
        other_selects = selects[1:]
        content_subquery = first_select.union_all(*other_selects).subquery()
       
    total_items = db.session.query(func.count()).select_from(content_subquery).scalar() or 0
    total_pages = max(1, (total_items + limit - 1) // limit)
    current_page = min(page, total_pages)
    offset = (current_page - 1) * limit

    if sort_type == 'rating_desc':
        order_by = [content_subquery.c.rating_num.desc(), content_subquery.c.content_type_position, content_subquery.c.id]
    elif sort_type == 'rating_asc':
        order_by = [content_subquery.c.rating_num.asc(), content_subquery.c.content_type_position, content_subquery.c.id]
    else:
        order_by = [content_subquery.c.content_type_position, content_subquery.c.id]

    rows = db.session.query(content_subquery).order_by(*order_by).offset(offset).limit(limit).all()

    return {
        'items': [_convert_content_to_dict(row) for row in rows],
        'totalItems': total_items,
        'totalPages': total_pages,
        'currentPage': current_page,
    }
    
def split_list(value):
    if not value:
        return []
    
    result = []
    for item in value.split(','):
        if item:
            result.append(item)
    return result