import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceGetData } from '../../Services/service-get-data';
import { ServiceState } from '../../Services/service-state';

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

    if (!this.email || !this.password) {
      this.error_message = 'Заполните все поля';
      this.cdr.detectChanges();
      return;
    }

    this.is_loading = true;
    this.service_get_data.Login({ email: this.email, password: this.password }).subscribe({
      next: (response: any) => {
        this.is_loading = false;
        this.service_state.SaveDataAndToken(response.user, response.access_token);
        this.router.navigate(['/']);
      },
      error: (error: any) => {
        this.is_loading = false;
        this.error_message = error.error?.error || 'Ошибка входа';
        this.cdr.detectChanges();
      }
    });
  }
}