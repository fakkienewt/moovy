import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { Content } from '../Models/ContentModel';

export interface ProfileData {
  content: Content[];
  state: {
    favorites: string[];
    watch_later: string[];
    watched: string[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private apiUrlMovies = 'http://127.0.0.1:5001/api/movies';
  private apiUrlTVSeries = 'http://127.0.0.1:5001/api/tv-series';
  private apiUrlAnime = 'http://127.0.0.1:5001/api/anime';
  private apiUrlPlayer = 'http://127.0.0.1:5001/api/get-iframe';
  private apiUrlBase = 'http://127.0.0.1:5001/api';

  private movies$?: Observable<Content[]>;
  private tvSeries$?: Observable<Content[]>;
  private anime$?: Observable<Content[]>;
  private profileCache = new Map<number, Observable<ProfileData>>();

  constructor(private http: HttpClient) { }

  getMovies(): Observable<Content[]> {
    if (!this.movies$) {
      this.movies$ = this.http.get<Content[]>(this.apiUrlMovies).pipe(
        map(items => items.map(item => ({ ...item, type: 'movie' as const }))),
        shareReplay(1)
      );
    }
    return this.movies$;
  }

  getTVSeries(): Observable<Content[]> {
    if (!this.tvSeries$) {
      this.tvSeries$ = this.http.get<Content[]>(this.apiUrlTVSeries).pipe(
        map(items => items.map(item => ({ ...item, type: 'tv-series' as const }))),
        shareReplay(1)
      );
    }
    return this.tvSeries$;
  }

  getAnime(): Observable<Content[]> {
    if (!this.anime$) {
      this.anime$ = this.http.get<Content[]>(this.apiUrlAnime).pipe(
        map(items => items.map(item => ({ ...item, type: 'anime' as const }))),
        shareReplay(1)
      );
    }
    return this.anime$;
  }

  getProfileData(userId: number): Observable<ProfileData> {
    if (!this.profileCache.has(userId)) {
      this.profileCache.set(
        userId,
        this.http.get<ProfileData>(`${this.apiUrlBase}/profile/${userId}`).pipe(
          shareReplay(1)
        )
      );
    }
    return this.profileCache.get(userId)!;
  }

  invalidateProfile(userId: number): void {
    this.profileCache.delete(userId);
  }

  getPlayerLink(id: number, source: string = 'movies'): Observable<any> {
    return this.http.get(`${this.apiUrlPlayer}/${id}?source=${source}`);
  }

  register(payload: { username: string; nickname: string; email: string; password: string }) {
    return this.http.post<{ message: string }>('http://127.0.0.1:5001/api/register', payload);
  }

  verifyEmail(payload: { email: string; code: string }) {
    return this.http.post<{
      message: string;
      user: { id: number; nickname: string; username: string; email: string };
    }>('http://127.0.0.1:5001/api/verify', payload);
  }

  login(payload: { email: string; password: string }) {
    return this.http.post<{
      message: string;
      user: { id: number; nickname: string; username: string; email: string };
    }>('http://127.0.0.1:5001/api/login', payload);
  }

  toggleFavorite(userId: number, key: string) {
    this.invalidateProfile(userId);
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.apiUrlBase}/favorites/toggle`, { user_id: userId, key }
    );
  }

  toggleWatchLater(userId: number, key: string) {
    this.invalidateProfile(userId);
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.apiUrlBase}/watch-later/toggle`, { user_id: userId, key }
    );
  }

  toggleWatched(userId: number, key: string) {
    this.invalidateProfile(userId);
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.apiUrlBase}/watched/toggle`, { user_id: userId, key }
    );
  }

  getUserState(userId: number) {
    return this.http.get<{
      favorites: string[];
      watch_later: string[];
      watched: string[];
    }>(`${this.apiUrlBase}/user-state/${userId}`);
  }

  deleteAccount(userId: number) {
    return this.http.delete<{ message: string }>(
      `${this.apiUrlBase}/delete-account/${userId}`
    );
  }
}