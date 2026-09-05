import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MovieNew } from '../Models/MovieModel';

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {
  private apiUrlMain = 'http://127.0.0.1:5000/api/new-items';
  private apiUrlPlayer = 'http://127.0.0.1:5001/api/get-iframe';

  constructor(private http: HttpClient) { }

  getNewItems(): Observable<MovieNew[]> {
    return this.http.get<MovieNew[]>(this.apiUrlMain);
  }

  getPlayerLink(id: number): Observable<any> {
    return this.http.get(`${this.apiUrlPlayer}/${id}`);
  }
}