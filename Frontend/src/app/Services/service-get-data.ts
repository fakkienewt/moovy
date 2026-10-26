import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { Content } from '../Models/ContentModel';

export interface ProfileData {
  content: Content[];
  state: {
    watching_now: string[];
    watch_later: string[];
    watched: string[];
  };
}

export interface ContentQuery {
  type?: string;
  page?: number;
  limit?: number;
  genre?: string;
  year?: string | number;
  country?: string;
  director?: string;
  actor?: string;
  search?: string;
  sort?: string;
}

export interface ContentResponse {
  items: Content[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface FilterOptions {
  genres: string[];
  years: string[];
  countries: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private apiUrlBase = 'http://127.0.0.1:5001/api';
  private profileCache$?: Observable<ProfileData>;

  constructor(private http: HttpClient) { }

  getMovies(): Observable<Content[]> {
    return this.http.get<Content[]>(`${this.apiUrlBase}/movies`).pipe(
      map(items => items.map(item => ({ ...item, type: 'movie' as const })))
    );
  }

  getTVSeries(): Observable<Content[]> {
    return this.http.get<Content[]>(`${this.apiUrlBase}/tv-series`).pipe(
      map(items => items.map(item => ({ ...item, type: 'tv-series' as const })))
    );
  }

  getAnime(): Observable<Content[]> {
    return this.http.get<Content[]>(`${this.apiUrlBase}/anime`).pipe(
      map(items => items.map(item => ({ ...item, type: 'anime' as const })))
    );
  }

  getContent(params: ContentQuery = {}): Observable<ContentResponse> {
    return this.http.get<ContentResponse>(
      `${this.apiUrlBase}/content`,
      { params: this.buildParams(params) }
    );
  }

  searchContent(query: string, limit: number = 7): Observable<ContentResponse> {
    return this.getContent({ search: query, page: 1, limit });
  }

  getFilterOptions(type: string = ''): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(
      `${this.apiUrlBase}/filter-options`,
      { params: this.buildParams({ type }) }
    );
  }

  getSuggestions(
    field: 'director' | 'actor',
    query: string,
    type: string = '',
    limit: number = 5
  ): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrlBase}/suggestions`,
      { params: this.buildParams({ field, q: query, type, limit }) }
    );
  }

  private buildParams(values: object): HttpParams {
    let params = new HttpParams();

    Object.entries(values).forEach(([key, value]) => {
      if ((typeof value === 'string' && value !== '') || typeof value === 'number') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  getProfileData(): Observable<ProfileData> {
    if (!this.profileCache$) {
      this.profileCache$ = this.http.get<ProfileData>(`${this.apiUrlBase}/profile`).pipe(
        shareReplay(1)
      );
    }
    return this.profileCache$;
  }

  invalidateProfile(): void {
    this.profileCache$ = undefined;
  }

  getPlayerLink(id: number, source: string = 'movies'): Observable<any> {
    return this.http.get(`${this.apiUrlBase}/get-iframe/${id}?source=${source}`);
  }

  register(payload: { username: string; nickname: string; email: string; password: string }) {
    return this.http.post<{ message: string }>(`${this.apiUrlBase}/register`, payload);
  }

  verifyEmail(payload: { email: string; code: string }) {
    return this.http.post<{
      message: string;
      access_token: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.apiUrlBase}/verify`, payload);
  }

  login(payload: { email: string; password: string }) {
    return this.http.post<{
      message: string;
      access_token: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.apiUrlBase}/login`, payload);
  }

  me() {
    return this.http.get<{ user: any }>(`${this.apiUrlBase}/me`);
  }

  toggleWatchingNow(key: string) {
    this.invalidateProfile();
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.apiUrlBase}/watch-now/toggle`, { key }
    );
  }

  toggleWatchLater(key: string) {
    this.invalidateProfile();
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.apiUrlBase}/watch-later/toggle`, { key }
    );
  }

  toggleWatched(key: string) {
    this.invalidateProfile();
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.apiUrlBase}/watched/toggle`, { key }
    );
  }

  getUserState() {
    return this.http.get<{
      watching_now: string[];
      watch_later: string[];
      watched: string[];
    }>(`${this.apiUrlBase}/user-state`);
  }

  deleteAccount() {
    return this.http.delete<{ message: string }>(`${this.apiUrlBase}/delete-account`);
  }

  updateNickname(nickname: string) {
    return this.http.patch<{
      message: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.apiUrlBase}/profile/nickname`, { nickname });
  }

  updateUsername(username: string) {
    return this.http.patch<{
      message: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.apiUrlBase}/profile/username`, { username });
  }

  updatePassword(payload: { old_password: string; new_password: string }) {
    return this.http.patch<{ message: string }>(`${this.apiUrlBase}/profile/password`, payload);
  }

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<{ message: string; avatar: string; user: any }>(
      `${this.apiUrlBase}/profile/avatar`, formData
    );
  }
}