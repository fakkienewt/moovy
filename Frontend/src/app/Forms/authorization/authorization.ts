import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ServiceGetData } from '../../Services/service-get-data';
import { FormsModule } from '@angular/forms';
import { AuthStateService } from '../../Services/auth-state-service';

@Component({
  selector: 'app-authorization',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './authorization.html',
  styleUrl: './authorization.scss',
})
export class Authorization {
  step: 1 | 2 = 1;
  username = '';
  nickname = '';
  email = '';
  password = '';
  confirm = '';
  code = '';
  error = '';
  loading = false;

  constructor(private router: Router,
    private api: ServiceGetData,
    private cdr: ChangeDetectorRef,
    private auth: AuthStateService) { }

  onClose() {
    this.router.navigate(['/']);
  }

  onSubmit() {
    this.error = '';

    if (!this.username || !this.nickname || !this.email || !this.password) {
      this.error = 'Заполните все поля'; return;
    }
    if (this.password.length < 8) {
      this.error = 'Пароль минимум 8 символов'; return;
    }
    if (this.password !== this.confirm) {
      this.error = 'Пароли не совпадают'; return;
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
    if (!this.code || this.code.length !== 6) {
      this.error = 'Введите 6-значный код'; return;
    }

    this.loading = true;
    this.api.verifyEmail({ email: this.email, code: this.code }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.auth.setUser(res.user);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Неверный код';
        this.cdr.detectChanges();
      }
    });
  }
}
