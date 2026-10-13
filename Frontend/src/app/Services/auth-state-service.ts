import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CurrentUser {
  id: number;
  nickname: string;
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly KEY = 'moovy_user';
  private userSubject = new BehaviorSubject<CurrentUser | null>(this.load());
  user$ = this.userSubject.asObservable();

  private load(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  setUser(user: CurrentUser): void {
    localStorage.setItem(this.KEY, JSON.stringify(user));
    this.userSubject.next(user);
  }

  getUser(): CurrentUser | null {
    return this.userSubject.value;
  }

  logout(): void {
    localStorage.removeItem(this.KEY);
    this.userSubject.next(null);
  }
}
