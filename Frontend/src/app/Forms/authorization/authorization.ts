import { Component, EventEmitter, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-authorization',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './authorization.html',
  styleUrl: './authorization.scss',
})
export class Authorization {
  constructor(private router: Router) { }

  onClose() {
    this.router.navigate(['/']);
  }
}
