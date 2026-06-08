import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // To avoid infinite loops, if the error comes from /refresh or /login, we don't try to refresh again
        if (
          req.url.includes('/auth/refresh') ||
          req.url.includes('/auth/login') ||
          req.url.includes('/auth/logout')
        ) {
          authService.clearSessionState();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        return authService.refreshSession().pipe(
          switchMap(() => next(authReq)),
          catchError((refreshError) => {
            authService.clearSessionState();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
