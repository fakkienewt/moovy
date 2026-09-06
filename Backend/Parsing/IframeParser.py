import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from DataBase.UpdateDB import db, Movies, app

CORS(app)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    'Referer': 'https://baskino.my/',
    'Origin': 'https://baskino.my'
}

@app.route('/api/get-iframe/<int:movie_id>')
def get_iframe(movie_id):
    movie = db.session.get(Movies, movie_id)
    
    if not movie or not movie.page_url:
        return jsonify({'error': 'Movie not found or page_url is empty'}), 404
        
    try:
        resp = requests.get(movie.page_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        panels = soup.find('div', class_='panels')
        if not panels:
            return jsonify({'error': 'No player panel found on the page'}), 404
            
        players = []
        for iframe in panels.find_all('iframe'):
            src = iframe.get('src') or iframe.get('data-src')
            
            if not src: continue
            
            if 'youtube' in src.lower() or 'youtu.be' in src.lower(): continue
                
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                src = urljoin(movie.page_url, src)
                
            players.append(src)
                
        if players:
            primary = players[1] if len(players) > 1 else players[0]
            return jsonify({
                'players': players, 
                'primary_player': primary,
                'movie_name': movie.name
            })
        else:
            return jsonify({'error': 'No valid players found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)