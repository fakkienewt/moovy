import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { Content } from '../Models/ContentModel';

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private apiUrlMovies = 'http://127.0.0.1:5000/api/movies';
  private apiUrlTVSeries = 'http://127.0.0.1:5000/api/tv-series';
  private apiUrlPlayer = 'http://127.0.0.1:5001/api/get-iframe';

  constructor(private http: HttpClient) { }

  getMovies(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlMovies).pipe(
      map(items => items.map(item => ({ ...item, type: 'movie' as const })))
    );
  }

  getTVSeries(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlTVSeries).pipe(
      map(items => items.map(item => ({ ...item, type: 'tv-series' as const })))
    );
  }

  getAnime(): Observable<Content[]> {
    return forkJoin({
      movies: this.getMovies(),
      series: this.getTVSeries()
    }).pipe(
      map(data => {
        const animeFromSeries = (data.series || []).filter(s =>
          s.genres && s.genres.toLowerCase().includes('аниме сериалы')
        );
        return [...(data.movies || []), ...animeFromSeries];
      })
    );
  }

  getPlayerLink(id: number, source: string = 'movies'): Observable<any> {
    return this.http.get(`${this.apiUrlPlayer}/${id}?source=${source}`);
  }
}