import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Content } from '../Models/ContentModel';

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private apiUrlMovies = 'http://127.0.0.1:5000/api/movies';
  private apiUrlPlayer = 'http://127.0.0.1:5001/api/get-iframe';

  constructor(private http: HttpClient) { }

  getMovies(): Observable<Content[]> {
    return this.http.get<Content[]>(this.apiUrlMovies);
  }

  getPlayerLink(id: number): Observable<any> {
    return this.http.get(`${this.apiUrlPlayer}/${id}`);
  }
}