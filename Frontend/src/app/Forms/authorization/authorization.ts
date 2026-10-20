import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceGetData } from '../../Services/service-get-data';
import { AuthStateService } from '../../Services/auth-state-service';

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
  confirm = '';
  code = '';
  error = '';
  loading = false;

  constructor(
    private router: Router,
    private api: ServiceGetData,
    private auth: AuthStateService,
    private cdr: ChangeDetectorRef
  ) { }

  onClose() {
    this.router.navigate(['/']);
  }

  onSubmit() {
    this.error = '';

    if (!this.nickname || !this.username || !this.email || !this.password || !this.confirm) {
      this.error = 'Заполните все поля';
      this.cdr.detectChanges();
      return;
    }

    if (this.password !== this.confirm) {
      this.error = 'Пароли не совпадают';
      this.cdr.detectChanges();
      return;
    }

    if (this.password.length < 8) {
      this.error = 'Пароль минимум 8 символов';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.api.register({
      username: this.username,
      nickname: this.nickname,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.step = 2;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Ошибка регистрации';
        this.cdr.detectChanges();
      }
    });
  }

  onVerify() {
    this.error = '';

    if (!this.code) {
      this.error = 'Введите код';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.api.verifyEmail({ email: this.email, code: this.code }).subscribe({
      next: (res) => {
        this.loading = false;
        this.auth.setSession(res.user, res.access_token);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Ошибка подтверждения';
        this.cdr.detectChanges();
      }
    });
  }
}