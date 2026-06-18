import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (this.auth.isAuthenticated) {
      return true;
    }

    return this.auth.validateSession().pipe(
      map(() => true),
      catchError(() => {
        this.auth.clearSessionState();
        return of(this.router.parseUrl('/login'));
      }),
    );
  }
}
