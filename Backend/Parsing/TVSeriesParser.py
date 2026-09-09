import sys
import os
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from DataBase.UpdateDB import db, TvSeries, app

BASE_URL = 'https://baskino.my'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9'
}

def parse_and_update_series(target_count=1000):
    print(f"Запуск обновления каталога СЕРИАЛОВ (цель: {target_count})...")
    
    print("Этап 1: Поиск новых сериалов...")
    added_count = 0
    page = 1
    
    while added_count < target_count and page <= 800:
        url = f'{BASE_URL}/serialy/page/{page}/' if page > 1 else f'{BASE_URL}/serialy/'
        
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, 'html.parser')
            posts = soup.find_all('div', class_='shortpost')
            
            if not posts: 
                print("Больше постов не найдено.")
                break
            
            for post in posts:
                if added_count >= target_count: break
                
                title_tag = post.find('div', class_='posttitle').find('a')
                link = title_tag['href'] if title_tag else None
                if not link: continue
                
                name_raw = title_tag.get_text(strip=True)
                name = re.sub(r'\s*\(\d{4}\)\s*$', '', name_raw).strip()
                
                year_match = re.search(r'\((\d{4})\)', name_raw)
                year = int(year_match.group(1)) if year_match else None
                
                rating_li = post.find('li', class_='current-rating')
                rating = None
                if rating_li:
                    w = re.search(r'width:(\d+)%', rating_li.get('style', ''))
                    if w: rating = str(int(w.group(1)) / 10)
                
                img_tag = post.find('img')
                poster = None
                if img_tag:
                    src = img_tag.get('data-src', '') or img_tag.get('src', '')
                    if src and 'base64' not in src and len(src) > 20:
                        poster = src if src.startswith('http') else urljoin(BASE_URL, src)

                page_url = urljoin(BASE_URL, link)

                existing = TvSeries.query.filter_by(name=name).first()
                if not existing:
                    if name and year and poster and rating and page_url:
                        new_series = TvSeries(
                            name=name, 
                            year=year, 
                            rating=rating, 
                            poster=poster, 
                            page_url=page_url,
                            genres='',
                            countries='',
                            directors='',
                            actors='',
                            time='',
                            description=''
                        )
                        db.session.add(new_series)
                        added_count += 1
                        print(f"[+] Добавлен: {name} ({year})")
                    else:
                        print(f"[-] Пропущен (пустые поля): {name}")
            
            page += 1
            if added_count % 20 == 0: 
                db.session.commit()
                print(f"... сохранено {added_count} записей")
                
        except Exception as e:
            print(f"Ошибка сканирования страницы {page}: {e}")
            break
            
    db.session.commit()
    print(f"Этап 1 завершен. Добавлено новых сериалов: {added_count}")

    print("Этап 2: Сбор полных данных (жанры, страны, описание)...")
    all_series = TvSeries.query.all()
    updated_count = 0
    
    for series in all_series:
        if all([series.genres, series.countries, series.directors, series.actors, series.time, series.description]):
            continue
            
        if not series.page_url: continue

        try:
            details = fetch_series_details(series.page_url)
            if details:
                is_updated = False
                if not series.genres and details.get('genres'):
                    series.genres = details['genres']; is_updated = True
                if not series.countries and details.get('countries'):
                    series.countries = details['countries']; is_updated = True
                if not series.directors and details.get('directors'):
                    series.directors = details['directors']; is_updated = True
                if not series.actors and details.get('actors'):
                    series.actors = details['actors']; is_updated = True
                if not series.time and details.get('time'):
                    series.time = details['time']; is_updated = True
                if not series.description and details.get('description'):
                    series.description = details['description']; is_updated = True
                    
                if is_updated:
                    updated_count += 1
                    if updated_count % 10 == 0: 
                        db.session.commit()
                    
        except Exception as e:
            print(f"Ошибка обновления {series.name}: {e}")
            
    db.session.commit()
    print(f"Этап 2 завершен. Обновлено записей: {updated_count}")

def fetch_series_details(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')
        data = {}
        
        json_ld = soup.find('script', type='application/ld+json')
        if json_ld:
            try:
                ld = json.loads(json_ld.string)
                if ld.get('genre'):
                    g_list = ld['genre'] if isinstance(ld['genre'], list) else [ld['genre']]
                    clean_g = [g.strip() for g in g_list if g.strip() not in ['Фильмы', 'Сериалы', 'TV Series']]
                    data['genres'] = ', '.join(clean_g[:5])
                if ld.get('director'):
                    d_list = ld['director'] if isinstance(ld['director'], list) else [ld['director']]
                    data['directors'] = ', '.join([d.get('name', '') for d in d_list if d.get('name')])
                if ld.get('actor'):
                    a_list = ld['actor'] if isinstance(ld['actor'], list) else [ld['actor']]
                    data['actors'] = ', '.join([a.get('name', '') for a in a_list if a.get('name')])
                if ld.get('countryOfOrigin'):
                    c_list = ld['countryOfOrigin'] if isinstance(ld['countryOfOrigin'], list) else [ld['countryOfOrigin']]
                    data['countries'] = ', '.join([c.get('name', '') for c in c_list if c.get('name')])
            except: pass

        table_rows = soup.find_all('tr')
        for row in table_rows:
            cells = row.find_all('td')
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value_cell = cells[1]
                
                if 'Жанр' in label and not data.get('genres'):
                    links = value_cell.find_all('a')
                    clean_g = [l.get_text(strip=True) for l in links if l.get_text(strip=True) not in ['Фильмы', 'Сериалы']]
                    if clean_g: data['genres'] = ', '.join(clean_g[:5])
                elif 'Страна' in label and not data.get('countries'):
                    links = value_cell.find_all('a')
                    if links: data['countries'] = ', '.join([l.get_text(strip=True) for l in links])
                    else: data['countries'] = value_cell.get_text(strip=True)
                elif 'Режиссер' in label and not data.get('directors'):
                    links = value_cell.find_all('a')
                    if links: data['directors'] = ', '.join([l.get_text(strip=True) for l in links])
                    else: data['directors'] = value_cell.get_text(strip=True)
                elif 'В главных ролях' in label and not data.get('actors'):
                    data['actors'] = value_cell.get_text(strip=True)
                elif 'Время' in label and not data.get('time'):
                    data['time'] = value_cell.get_text(strip=True)

        desc_container = soup.find('div', class_='description')
        if desc_container and not data.get('description'):
            paragraphs = desc_container.find_all('p')
            if paragraphs:
                full_desc = '\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
                data['description'] = full_desc.strip()[:2000]
            else:
                data['description'] = desc_container.get_text(separator='\n', strip=True)[:2000]

        return data
    except Exception as e:
        print(f"Ошибка парсинга деталей {url}: {e}")
        return None

if __name__ == '__main__':
    with app.app_context():
        parse_and_update_series(target_count=1000)