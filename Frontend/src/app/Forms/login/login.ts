import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceGetData } from '../../Services/service-get-data';
import { AuthStateService } from '../../Services/auth-state-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
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

    if (!this.email || !this.password) {
      this.error = 'Заполните все поля';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        this.auth.setSession(res.user, res.access_token);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Ошибка входа';
        this.cdr.detectChanges();
      }
    });
  }
}