from flask import Blueprint, request, jsonify
from Services.content_service import get_paginated_content

pagination_blueprint = Blueprint('pagination', __name__, url_prefix='/api')

@pagination_blueprint.route('/content', methods=['GET', 'OPTIONS'])
def get_content():
    return jsonify(get_paginated_content(request.args))