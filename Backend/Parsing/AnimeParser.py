import sys
import os
import re
import json

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from DataBase.UpdateDB import db, Anime, app

BASE_URL = 'https://tv.kinobar.im'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9'
}


def parse_and_update_anime():
    print("=== ЗАПУСК ПАРСЕРА АНИМЕ ===")

    with app.app_context():
        Anime.__table__.drop(db.engine, checkfirst=True)
        db.create_all()
        print("[!] Таблица anime удалена и создана заново.")

    added_count = 0
    page = 1
    consecutive_duplicates = 0

    while page <= 800:
        url = f'{BASE_URL}/anime/page/{page}/' if page > 1 else f'{BASE_URL}/anime/'

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, 'html.parser')
            posts = soup.find_all('div', class_='main_news')

            if not posts:
                print(f"Страница {page}: постов не найдено. Завершение этапа 1.")
                break

            new_found = False
            for post in posts:
                title_tag = post.find('h2', class_='zagolovok').find('a')
                link = title_tag['href'] if title_tag else None
                if not link:
                    continue

                name_raw = title_tag.get_text(strip=True)
                name = re.sub(r'\s*\(\d{4}\)\s*$', '', name_raw).strip()

                year_match = re.search(r'\((\d{4})\)', name_raw)
                year = int(year_match.group(1)) if year_match else None

                page_url = urljoin(BASE_URL, link)

                existing = Anime.query.filter_by(name=name).first()

                if not existing and name and year and page_url:
                    new_anime = Anime(
                        name=name,
                        year=year,
                        rating='0',
                        poster='',
                        page_url=page_url,
                        genres='',
                        countries='',
                        directors='',
                        actors='',
                        time='',
                        description=''
                    )
                    db.session.add(new_anime)
                    db.session.commit()

                    added_count += 1
                    consecutive_duplicates = 0
                    new_found = True
                    print(f"[+] Аниме: {name} ({year})")
                else:
                    consecutive_duplicates += 1
                    if consecutive_duplicates >= 50:
                        print("Обнаружен бесконечный блок дубликатов. Завершение сбора.")
                        page = 801
                        break

            if page > 800:
                break
            page += 1

        except Exception as e:
            print(f"Ошибка на странице {page}: {e}")
            break

    print(f"Этап 1 завершен. Найдено аниме: {added_count}")

    print("Сбор деталей и исправление постеров...")
    all_anime = Anime.query.all()
    updated = 0

    for anime in all_anime:
        if (all([anime.genres, anime.countries, anime.directors, anime.description]) and
                anime.poster and 'base64' not in anime.poster and len(anime.poster) > 20):
            continue

        try:
            resp = requests.get(anime.page_url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, 'html.parser')

            if not anime.poster or 'base64' in anime.poster or len(anime.poster) < 20:
                meta_og = soup.find('meta', property='og:image')
                if meta_og and meta_og.get('content'):
                    anime.poster = meta_og['content']

            info_list = soup.find('ul', class_='fi_ul')
            if info_list:
                items = info_list.find_all('li')
                for item in items:
                    text = item.get_text(strip=True)

                    if 'Жанр:' in text and not anime.genres:
                        clean_genre = text.replace('Жанр:', '').strip()
                        anime.genres = ', '.join(
                            [g.strip() for g in clean_genre.split(',') if g.strip() not in ['Фильмы', 'Сериалы']][:5]
                        )
                    elif 'Страна:' in text and not anime.countries:
                        anime.countries = text.replace('Страна:', '').strip()
                    elif 'Режиссер:' in text and not anime.directors:
                        anime.directors = text.replace('Режиссер:', '').strip()
                    elif 'В ролях:' in text and not anime.actors:
                        anime.actors = text.replace('В ролях:', '').strip()
                    elif 'Время:' in text and not anime.time:
                        anime.time = text.replace('Время:', '').strip()

            story_div = soup.find('div', class_='fn_text')
            if story_div and not anime.description:
                desc = story_div.get_text(strip=True).replace('...', '').strip()
                anime.description = desc[:2000]

            imdb_block = soup.find('div', class_='imdb')
            if imdb_block:
                rating_container = imdb_block.find('div', class_='total-rating')
                if rating_container:
                    rating_span = rating_container.find('span')
                    if rating_span:
                        raw_rating = rating_span.get_text(strip=True)
                        if raw_rating:
                            anime.rating = raw_rating

            db.session.commit()
            updated += 1
            if updated % 10 == 0:
                print(f"... обновлено {updated} записей")

        except Exception as e:
            print(f"Ошибка обновления {anime.name}: {e}")

    print(f"Готово. Обновлено записей: {updated}")


if __name__ == '__main__':
    with app.app_context():
        parse_and_update_anime()