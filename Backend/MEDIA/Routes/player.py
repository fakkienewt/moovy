from flask import Blueprint, request, jsonify
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from DataBase.UpdateDB import db, Movies, TvSeries, Anime

player_blueprint = Blueprint('player', __name__, url_prefix='/api')

HEADERS_BASKINO = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    'Referer': 'https://baskino.my/',
    'Origin': 'https://baskino.my'
}

HEADERS_KINOBAR = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9',
    'Referer': 'https://tv.kinobar.im/',
    'Origin': 'https://tv.kinobar.im'
}


@player_blueprint.route('/get-iframe/<int:content_id>', methods=['GET'])
def get_iframe(content_id):
    source = request.args.get('source', 'movies')
    content_item = None

    if source == 'tv-series':
        content_item = db.session.get(TvSeries, content_id)
    elif source == 'anime':
        content_item = db.session.get(Anime, content_id)
    else:
        content_item = db.session.get(Movies, content_id)

    if not content_item:
        if source == 'tv-series':
            content_item = db.session.get(Movies, content_id) or db.session.get(Anime, content_id)
        elif source == 'anime':
            content_item = db.session.get(Movies, content_id) or db.session.get(TvSeries, content_id)
        else:
            content_item = db.session.get(TvSeries, content_id) or db.session.get(Anime, content_id)

    if not content_item or not content_item.page_url:
        return jsonify({'error': f'Content {content_id} not found'}), 404

    try:
        headers = HEADERS_KINOBAR if 'kinobar' in content_item.page_url else HEADERS_BASKINO
        resp = requests.get(content_item.page_url, headers=headers, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')
        players = []

        panels = soup.find('div', class_='panels')
        if panels:
            for iframe in panels.find_all('iframe'):
                src = iframe.get('src') or iframe.get('data-src')
                if src and 'youtube' not in src.lower():
                    if src.startswith('//'):
                        src = 'https:' + src
                    elif src.startswith('/'):
                        src = urljoin(content_item.page_url, src)
                    players.append(src)

        if not players:
            boxes = soup.find_all('div', class_='box')
            for box in boxes:
                iframe = box.find('iframe')
                if iframe:
                    src = iframe.get('src') or iframe.get('data-src')
                    if src and 'youtube' not in src.lower() and 'fotpro' not in src.lower():
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            src = urljoin(content_item.page_url, src)
                        players.append(src)

            if not players:
                udvb = soup.find('div', class_='udvb-container')
                if udvb:
                    iframe = udvb.find('iframe')
                    if iframe:
                        src = iframe.get('src')
                        if src and 'fotpro' not in src.lower():
                            players.append(src)

        if players:
            return jsonify({
                'players': players,
                'primary_player': players[0],
                'content_name': content_item.name,
                'source': source
            })
        return jsonify({'error': 'No valid players found on page'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500