import sys
import os
import re
import json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from DataBase.UpdateDB import db, MovieNewItems, app

BASE_URL = 'https://baskino.my'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9'
}

def parse_new_items(limit=10):
    print(f"Парсинг новинок 2025-2026 с {BASE_URL}")
    
    try:
        count_deleted = MovieNewItems.query.delete()
        db.session.commit()
        print(f"Удалено старых записей: {count_deleted}")
    except Exception as e:
        print(f"Ошибка очистки: {e}")
        db.session.rollback()
        return

    saved = 0
    page = 1
    
    while saved < limit and page <= 20:
        url = f'{BASE_URL}/lastnews/page/{page}/' if page > 1 else f'{BASE_URL}/lastnews/'
        
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            posts = soup.find_all('div', class_='shortpost')
            if not posts: break
            
            for post in posts:
                if saved >= limit: break
                
                title_tag = post.find('a', class_='card-img') or post.find('div', class_='posttitle').find('a')
                link = title_tag['href'] if title_tag else None
                if not link: continue
                
                year_match = re.search(r'\((\d{4})\)', title_tag.get_text())
                year = int(year_match.group(1)) if year_match else 0
                
                if year not in [2025, 2026]: continue
                
                film_url = urljoin(BASE_URL, link)
                movie_data = parse_movie_detail(film_url)
                
                if movie_data and is_valid_movie(movie_data):
                    save_to_db(movie_data)
                    saved += 1
                    
            page += 1
            
        except Exception as e:
            print(f"Ошибка на странице {page}: {e}")
            break

def is_valid_movie(data):
    """Проверяет наличие всех обязательных полей"""
    required_fields = ['name', 'year', 'rating', 'poster', 'page_url', 'directors']
    for field in required_fields:
        if not data.get(field):
            print(f"ПРОПУЩЕНО '{data.get('name', 'Unknown')}': отсутствует {field}")
            return False
    return True

def parse_movie_detail(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        data = {
            'name': None, 'year': None, 'genres': None, 
            'countries': None, 'directors': None, 'actors': None,
            'time': None, 'description': None, 'poster': None, 'rating': None,
            'page_url': url  
        }

        json_ld = soup.find('script', type='application/ld+json')
        if json_ld:
            try:
                ld = json.loads(json_ld.string)
                
                name_full = ld.get('name', '') or ld.get('headline', '')
                data['name'] = re.sub(r'\s*\(\d{4}\)', '', name_full).strip()
                
                year_str = str(ld.get('dateCreated', ''))
                if year_str.isdigit(): data['year'] = int(year_str)
                
                genres_list = ld.get('genre', [])
                if isinstance(genres_list, list):
                    clean_genres = [g for g in genres_list if g not in ['Фильмы', 'Сериалы']]
                    data['genres'] = ', '.join(clean_genres[:4]) if clean_genres else None
                
                actors_list = ld.get('actor', [])
                if isinstance(actors_list, list):
                    data['actors'] = ', '.join([a.get('name', '') for a in actors_list if a.get('name')])
                
                directors_list = ld.get('director', [])
                if isinstance(directors_list, list):
                    data['directors'] = ', '.join([d.get('name', '') for d in directors_list if d.get('name')])
                
                countries_list = ld.get('countryOfOrigin', [])
                if isinstance(countries_list, list):
                    data['countries'] = ', '.join([c.get('name', '') for c in countries_list if c.get('name')])
                
                rating_data = ld.get('aggregateRating', {})
                if rating_data: data['rating'] = str(rating_data.get('ratingValue', ''))
                    
            except Exception as e:
                print(f"Ошибка JSON-LD: {e}")

        if not data['name']:
            h1 = soup.find('h1')
            if h1:
                name_text = h1.get_text(strip=True)
                data['name'] = re.sub(r'\s*\(\d{4}\)', '', name_text).strip()
                y_match = re.search(r'\((\d{4})\)', name_text)
                if y_match and not data['year']: data['year'] = int(y_match.group(1))

        if not data['poster']:
            img_tag = soup.find('img', src=lambda x: x and 'uploads' in x)
            if img_tag: data['poster'] = urljoin(BASE_URL, img_tag['src'])

        if not data['description']:
            desc_tag = soup.find('div', class_='description')
            if desc_tag: data['description'] = desc_tag.get_text(strip=True)[:500]

        table_rows = soup.find_all('tr')
        for row in table_rows:
            cells = row.find_all('td')
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)
                
                if 'Время' in label and not data['time']: data['time'] = value
                elif 'Страна' in label and not data['countries']:
                    links = cells[1].find_all('a')
                    data['countries'] = ', '.join([l.get_text(strip=True) for l in links]) if links else value
                elif 'Режиссер' in label and not data['directors']:
                    links = cells[1].find_all('a')
                    data['directors'] = ', '.join([l.get_text(strip=True) for l in links]) if links else value
                elif 'Жанр' in label and not data['genres']:
                    links = cells[1].find_all('a')
                    clean_g = [l.get_text(strip=True) for l in links if l.get_text(strip=True) not in ['Фильмы', 'Сериалы']]
                    data['genres'] = ', '.join(clean_g[:4]) if clean_g else None
                elif 'В главных ролях' in label and not data['actors']:
                    data['actors'] = value

        if not data['rating']:
            rate_stats = soup.find('div', class_='ratestats-rate')
            if rate_stats:
                b_tag = rate_stats.find('b')
                if b_tag: data['rating'] = b_tag.get_text(strip=True)

        return {k: v for k, v in data.items() if v is not None}
        
    except Exception as e:
        print(f"Ошибка парсинга детали {url}: {e}")
        return None

def save_to_db(data):
    existing = MovieNewItems.query.filter_by(name=data['name']).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        
    new_movie = MovieNewItems(**data)
    db.session.add(new_movie)
    db.session.commit()
    print(f"СОХРАНЕНО: {data['name']} ({data['year']}) | Р: {data['rating']}")

if __name__ == '__main__':
    with app.app_context():
        parse_new_items(limit=10)