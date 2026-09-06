import { HttpClient } from '@angular/common/http';
import { ContentChildren, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Content } from '../Models/ContentModel';
@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private apiUrlMain = 'http://127.0.0.1:5000/api/new-items';
  private apiUrlMovies = 'http://127.0.0.1:5000/api/movies';
  private apiUrlPlayer = 'http://127.0.0.1:5001/api/get-iframe';

  constructor(private http: HttpClient) { }

  getNewItems(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlMain);
  }

  getMovies(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlMovies);
  }

  getPlayerLink(id: number): Observable<any> {
    return this.http.get(`${this.apiUrlPlayer}/${id}`);
  }
}

