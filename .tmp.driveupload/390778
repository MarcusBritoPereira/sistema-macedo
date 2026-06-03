import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const authReq = req.clone({
        withCredentials: true
    });

    return next(authReq).pipe(
        catchError((error) => {
            if (error.status === 401) {
                // To avoid infinite loops, if the error comes from /refresh or /login, we don't try to refresh again
                if (req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
                    authService.clearSessionState();
                    router.navigate(['/login']);
                    return throwError(() => error);
                }

                // Call refresh endpoint and retry logic should ideally be here, 
                // but since we want to keep it simple as a starting point and we rely on backend automatic cookies, 
                // we can just force the user to login again for now or trigger a reload that checks session.
                // For a complete flow, we'd inject HttpClient and call POST /auth/refresh here.
                authService.clearSessionState();
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
