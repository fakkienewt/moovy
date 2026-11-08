import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ServiceState } from '../Services/service-state';

@Injectable()
export class Interceptor implements HttpInterceptor {

  constructor(private service_state: ServiceState, private router: Router) {}

  intercept(request: HttpRequest<any>, nextHandler: HttpHandler): Observable<HttpEvent<any>> {
    let token = this.service_state.GetJWTFromLocalStorage();

    let request_with_token = request;
    if (token) {
      request_with_token = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return nextHandler.handle(request_with_token).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.service_state.LogoutFromAccount();
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}