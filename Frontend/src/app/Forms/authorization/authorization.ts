import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceGetData } from '../../Services/service-get-data';
import { ServiceState } from '../../Services/service-state';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './authorization.html',
  styleUrl: './authorization.scss',
})
export class Authorization {
  step: 1 | 2 = 1;
  nickname = '';
  username = '';
  email = '';
  password = '';
  confirm_password = '';
  code = '';
  error_message = '';
  is_loading = false;

  constructor(
    private router: Router,
    private service_get_data: ServiceGetData,
    private service_state: ServiceState,
    private cdr: ChangeDetectorRef
  ) { }

  OnClose(): void {
    this.router.navigate(['/']);
  }

  OnSubmit(): void {
    this.error_message = '';

    if (!this.nickname || !this.username || !this.email || !this.password || !this.confirm_password) {
      this.error_message = 'Заполните все поля';
      this.cdr.detectChanges();
      return;
    }

    if (this.password !== this.confirm_password) {
      this.error_message = 'Пароли не совпадают';
      this.cdr.detectChanges();
      return;
    }

    if (this.password.length < 8) {
      this.error_message = 'Пароль минимум 8 символов';
      this.cdr.detectChanges();
      return;
    }

    this.is_loading = true;
    this.service_get_data.CreateUserAccount({
      username: this.username,
      nickname: this.nickname,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.is_loading = false;
        this.step = 2;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.is_loading = false;
        this.error_message = error.error?.error || 'Ошибка регистрации';
        this.cdr.detectChanges();
      }
    });
  }

  OnVerify(): void {
    this.error_message = '';

    if (!this.code) {
      this.error_message = 'Введите код';
      this.cdr.detectChanges();
      return;
    }

    this.is_loading = true;
    this.service_get_data.VerifyEmail({ email: this.email, code: this.code }).subscribe({
      next: (response: any) => {
        this.is_loading = false;
        this.service_state.SaveDataAndToken(response.user, response.access_token);
        this.router.navigate(['/']);
      },
      error: (error: any) => {
        this.is_loading = false;
        this.error_message = error.error?.error || 'Ошибка подтверждения';
        this.cdr.detectChanges();
      }
    });
  }
}