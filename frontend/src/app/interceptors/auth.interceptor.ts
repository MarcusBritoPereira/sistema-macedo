import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error) => {
            if (error.status === 401) {
                // Clear token
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Redirect to login
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
