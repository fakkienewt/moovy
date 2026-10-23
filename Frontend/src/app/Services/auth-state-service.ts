import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CurrentUser {
  id: number;
  nickname: string;
  username: string;
  email: string;
  avatar?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly USER_KEY = 'moovy_user';
  private readonly TOKEN_KEY = 'moovy_token';

  private userSubject = new BehaviorSubject<CurrentUser | null>(this.loadUser());
  user$ = this.userSubject.asObservable();

  private loadUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setSession(user: CurrentUser, token: string): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.TOKEN_KEY, token);
    this.userSubject.next(user);
  }

  setUser(user: CurrentUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.userSubject.next(user);
  }

  getUser(): CurrentUser | null {
    return this.userSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.userSubject.next(null);
  }
}