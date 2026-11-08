import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CurrentUserModel } from '../Models/CurrentUserModel';

@Injectable({
  providedIn: 'root',
})
export class ServiceState {
  private readonly USER_KEY = 'moovy_user';
  private readonly TOKEN_KEY = 'moovy_token';

  private user_behavior_subject = new BehaviorSubject<CurrentUserModel | null>(this.LoadUserFromLocalStorage());
  user$ = this.user_behavior_subject.asObservable();

  private LoadUserFromLocalStorage(): CurrentUserModel | null {
    try {
      const raw_data = localStorage.getItem(this.USER_KEY);
      return raw_data ? JSON.parse(raw_data) : null;
    } catch {
      return null;
    }
  }

  SaveDataAndToken(user: CurrentUserModel, token: string): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.TOKEN_KEY, token);
    this.user_behavior_subject.next(user);
  }

  UpdateUserData(user: CurrentUserModel): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.user_behavior_subject.next(user);
  }

  GetCurrentUserData(): CurrentUserModel | null {
    return this.user_behavior_subject.value;
  }

  GetJWTFromLocalStorage(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedInUserOrNot(): boolean {
    return !!this.GetJWTFromLocalStorage() && !!this.GetCurrentUserData();
  }

  LogoutFromAccount(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.user_behavior_subject.next(null);
  }
}