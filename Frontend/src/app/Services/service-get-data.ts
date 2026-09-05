import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MovieNew } from '../Models/MovieModel';

@Injectable({
  providedIn: 'root',
})
export class ServiceGetData {

  constructor(private http: HttpClient) { }

  private apiURL = 'http://127.0.0.1:5000/api/new-items';

  getNewItems(): Observable<MovieNew[]> {
    return this.http.get<MovieNew[]>(this.apiURL);
  }
}
