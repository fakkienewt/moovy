import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Content } from '../Models/ContentModel';

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private apiUrlMovies = 'http://127.0.0.1:5001/api/movies';
  private apiUrlTVSeries = 'http://127.0.0.1:5001/api/tv-series';
  private apiUrlAnime = 'http://127.0.0.1:5001/api/anime';
  private apiUrlPlayer = 'http://127.0.0.1:5001/api/get-iframe';

  constructor(private http: HttpClient) { }

  getMovies(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlMovies).pipe(
      map(items => items.map(item => ({ ...item, type: 'movie' })))
    );
  }

  getTVSeries(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlTVSeries).pipe(
      map(items => items.map(item => ({ ...item, type: 'tv-series' })))
    );
  }

  getAnime(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlAnime).pipe(
      map(items => items.map(item => ({ ...item, type: 'anime' })))
    );
  }

  getPlayerLink(id: number, source: string = 'movies'): Observable<any> {
    return this.http.get(`${this.apiUrlPlayer}/${id}?source=${source}`);
  }
}