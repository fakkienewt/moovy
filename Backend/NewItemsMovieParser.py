import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from UpdateDB import db, MovieNewItems, app

BASE_URL = 'https://tv.kinobar.im'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def parse_new_items(max_pages=5):
    count = 0
    for page in range(1, max_pages + 1):
        if count >= 17: 
            break
            
        url = f'{BASE_URL}/novvinki-kino/page/{page}/' if page > 1 else f'{BASE_URL}/novvinki-kino/'
        
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            movies_blocks = soup.find_all('div', class_='main_news')
            
            for block in movies_blocks:
                if count >= 17: 
                    break
                    
                title_tag = block.find('h2', class_='zagolovok')
                link_tag = title_tag.find('a') if title_tag else None
                
                if not link_tag or not link_tag.get('href'):
                    continue
                    
                film_url = urljoin(BASE_URL, link_tag['href'])
                
                title = link_tag.get_text(strip=True)
                print(f"Парсится: {title}")
                
                movie_data = parse_movie_detail(film_url)
                if movie_data:
                    save_to_db(movie_data)
                    count += 1
                    
        except Exception as e:
            print(f"ОШИБКА НА СТРАНИЦЕ {page}: {e}")

def parse_movie_detail(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        title_tag = soup.find('h1', itemprop='name')
        name = title_tag.get_text(strip=True) if title_tag else None
        
        year = None
        year_tag = soup.find('span', itemprop='dateCreated')
        if year_tag:
            try:
                year = int(year_tag.get_text(strip=True))
            except ValueError:
                pass
        
        genres = None
        genre_label = soup.find('b', string=lambda t: t and 'Жанр' in t)
        if genre_label:
            parent_li = genre_label.find_parent('li')
            if parent_li:
                full_text = parent_li.get_text()
                clean_text = full_text.replace('Жанр:', '').replace('Жанры:', '').strip()
                if clean_text:
                    genres = ', '.join([g.strip() for g in clean_text.split(',') if g.strip()])

        country_tag = soup.find('span', itemprop='countryOfOrigin')
        countries = country_tag.get_text(strip=True) if country_tag else None
        
        director_tag = soup.find('span', itemprop='director')
        directors = director_tag.get_text(strip=True) if director_tag else None
        
        actor_tags = soup.find_all('span', itemprop='actor')
        actors = ', '.join([a.get_text(strip=True) for a in actor_tags]) if actor_tags else None
        
        time_tag = soup.find('span', itemprop='duration')
        duration = time_tag.get_text(strip=True) if time_tag else None
        
        desc_tag = soup.find('span', itemprop='description')
        description = desc_tag.get_text(strip=True) if desc_tag else None
        
        poster_tag = soup.find('img', itemprop='image')
        poster = poster_tag['src'] if poster_tag and poster_tag.get('src') else None
        
        rating = None
        kp_block = soup.find('div', class_='kp')
        if kp_block:
            rating_div = kp_block.find('div', class_='total-rating')
            if rating_div:
                span = rating_div.find('span')
                if span:
                    text = span.get_text(strip=True)
                    if '.' in text and any(c.isdigit() for c in text):
                        rating = ''.join(c for c in text if c.isdigit() or c == '.')
        
        return {
            'name': name, 
            'year': year, 
            'genres': genres,
            'countries': countries, 
            'directors': directors,
            'actors': actors, 
            'time': duration,
            'description': description, 
            'poster': poster,
            'rating': rating,
            'page_url': url
        }
        
    except Exception as e:
        print(f"НЕ УДАЛОСЬ СПАРСИТЬ {url}: {e}")
        return None

def save_to_db(data):
    if not data['name']:
        return
    
    if not data['rating'] or data['rating'] == '0.0' or data['rating'] == '0':
        existing = MovieNewItems.query.filter_by(name=data['name']).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            print(f"УДАЛЕНО (нет рейтинга): {data['name']}")
        else:
            print(f"ПРОПУЩЕНО (нет рейтинга): {data['name']}")
        return
        
    existing = MovieNewItems.query.filter_by(name=data['name']).first()
    
    if existing:
        needs_update = (
            not existing.genres or 
            not existing.rating or 
            not existing.page_url
        )
        
        if needs_update:
            existing.genres = data['genres'] or existing.genres
            existing.rating = data['rating'] or existing.rating
            existing.page_url = data['page_url'] or existing.page_url
            existing.year = data['year'] or existing.year
            existing.countries = data['countries'] or existing.countries
            existing.directors = data['directors'] or existing.directors
            existing.actors = data['actors'] or existing.actors
            existing.time = data['time'] or existing.time
            existing.description = data['description'] or existing.description
            existing.poster = data['poster'] or existing.poster
            
            db.session.commit()
            print(f"ОБНОВЛЕНО: {data['name']} | Жанр: {data['genres']} | Рейтинг: {data['rating']}")
        else:
            print(f"УЖЕ ПОЛНОСТЬЮ ЗАПОЛНЕН: {data['name']}")
        return
        
    new_movie = MovieNewItems(**data)
    db.session.add(new_movie)
    db.session.commit()
    print(f"СОХРАНЕНО: {data['name']} | URL: {data['page_url']}")

if __name__ == '__main__':
    with app.app_context():
        parse_new_items(max_pages=5)