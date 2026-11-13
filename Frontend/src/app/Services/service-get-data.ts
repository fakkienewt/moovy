import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { ContentModel } from '../Models/ContentModel';
import { ContentQueryModel } from '../Models/ContentQueryModel';
import { FilterOptionsModel } from '../Models/FilterOptionsModel';
import { ContentResponseModel } from '../Models/ContentResponseModel';
import { ProfileDataModel } from '../Models/ProfileDataModl';
import { PlayerResponseModel } from '../Models/PlayerResponseModel';
import { CommentModel } from '../Models/CommentModel';

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private api_url_base = 'http://127.0.0.1:5001/api';
  private profile_cache?: Observable<ProfileDataModel>;

  constructor(private http: HttpClient) { }

  GetMovies(): Observable<ContentModel[]> {
    return this.http.get<ContentModel[]>(`${this.api_url_base}/movies`).pipe(
      map(items => items.map(item => ({ ...item, type: 'movie' })))
    );
  }

  GetTVSeries(): Observable<ContentModel[]> {
    return this.http.get<ContentModel[]>(`${this.api_url_base}/tv-series`).pipe(
      map(items => items.map(item => ({ ...item, type: 'tv-series' })))
    );
  }

  GetAnime(): Observable<ContentModel[]> {
    return this.http.get<ContentModel[]>(`${this.api_url_base}/anime`).pipe(
      map(items => items.map(item => ({ ...item, type: 'anime' })))
    );
  }

  GetPaginatedContent(params: ContentQueryModel = {}): Observable<ContentResponseModel> {
    return this.http.get<ContentResponseModel>(
      `${this.api_url_base}/content`,
      { params: this.CreateHttpParams(params) }
    );
  }

  SearchContent(query: string, limit: number = 10): Observable<ContentResponseModel> {
    return this.GetPaginatedContent({ search: query, page: 1, limit });
  }

  GetFilterOptions(type: string = ''): Observable<FilterOptionsModel> {
    return this.http.get<FilterOptionsModel>(
      `${this.api_url_base}/filter-options`,
      { params: this.CreateHttpParams({ type }) }
    );
  }

  GetSuggestions(
    searchCategory: 'director' | 'actor',
    query: string,
    type: string = '',
    limit: number = 5
  ): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.api_url_base}/suggestions`,
      { params: this.CreateHttpParams({ search_category: searchCategory, q: query, type, limit }) }
    );
  }

  private CreateHttpParams(values: object): HttpParams {
    let params = new HttpParams();

    Object.entries(values).forEach(([key, value]) => {
      if ((typeof value === 'string' && value !== '') || typeof value === 'number') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  GetProfileData(): Observable<ProfileDataModel> {
    if (!this.profile_cache) {
      this.profile_cache = this.http.get<ProfileDataModel>(`${this.api_url_base}/profile`).pipe(
        shareReplay(1)
      );
    }
    return this.profile_cache;
  }

  ResetProfileCache(): void {
    this.profile_cache = undefined;
  }

  GetPlayerLink(id: number, source: string = 'movies'): Observable<PlayerResponseModel> {
    return this.http.get<PlayerResponseModel>(`${this.api_url_base}/get-iframe/${id}?source=${source}`);
  }

  CreateUserAccount(payload: { username: string; nickname: string; email: string; password: string }) {
    return this.http.post<{ message: string }>(`${this.api_url_base}/register`, payload);
  }

  VerifyEmail(payload: { email: string; code: string }) {
    return this.http.post<{
      message: string;
      access_token: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.api_url_base}/verify`, payload);
  }

  Login(payload: { email: string; password: string }) {
    return this.http.post<{
      message: string;
      access_token: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.api_url_base}/login`, payload);
  }

  GetMyProfile() {
    return this.http.get<{ user: any }>(`${this.api_url_base}/me`);
  }

  SwitchWatchingNow(key: string) {
    this.ResetProfileCache();
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.api_url_base}/watch-now/switch`, { key }
    );
  }

  SwitchWatchLater(key: string) {
    this.ResetProfileCache();
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.api_url_base}/watch-later/switch`, { key }
    );
  }

  SwitchWatched(key: string) {
    this.ResetProfileCache();
    return this.http.post<{ active: boolean; items: string[] }>(
      `${this.api_url_base}/watched/switch`, { key }
    );
  }

  GetUserMovieLists() {
    return this.http.get<{
      watching_now: string[];
      watch_later: string[];
      watched: string[];
    }>(`${this.api_url_base}/user_list`);
  }

  DeleteAccount() {
    return this.http.delete<{ message: string }>(`${this.api_url_base}/delete-account`);
  }

  UpdateNickname(nickname: string) {
    return this.http.patch<{
      message: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.api_url_base}/profile/nickname`, { nickname });
  }

  UpdateUsername(username: string) {
    return this.http.patch<{
      message: string;
      user: { id: number; nickname: string; username: string; email: string; created_at?: string };
    }>(`${this.api_url_base}/profile/username`, { username });
  }

  UpdatePassword(payload: { old_password: string; new_password: string }) {
    return this.http.patch<{ message: string }>(`${this.api_url_base}/profile/password`, payload);
  }

  UploadAvatar(file: File) {
    let formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<{ message: string; avatar: string; user: any }>(
      `${this.api_url_base}/profile/avatar`, formData
    );
  }

  GetComments(content_key: string): Observable<CommentModel[]> {
    return this.http.get<CommentModel[]>(`${this.api_url_base}/comments/${content_key}`);
  }

  AddComment(content_key: string, text: string): Observable<CommentModel> {
    return this.http.post<CommentModel>(`${this.api_url_base}/comments/${content_key}`, { text });
  }

  DeleteComment(content_key: string, comment_id: string) {
    return this.http.delete<{ message: string }>(`${this.api_url_base}/comments/${content_key}/${comment_id}`);
  }

  UpdateComment(content_key: string, comment_id: string, text: string) {
    return this.http.put<{ message: string; text: string }>(`${this.api_url_base}/comments/${content_key}/${comment_id}`, { text });
  }

  VoteComment(content_key: string, comment_id: string, vote_type: 'like' | 'dislike') {
    return this.http.post<{ likes_count: number; dislikes_count: number; user_vote: string | null }>(
      `${this.api_url_base}/comments/${content_key}/${comment_id}/vote`,
      { vote_type }
    );
  }

  GetUserComments(user_id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api_url_base}/comments/user/${user_id}`);
  }
}