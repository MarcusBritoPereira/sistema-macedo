import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
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

  canActivate(
    _route: unknown,
    state: RouterStateSnapshot,
  ): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (this.auth.isAuthenticated) {
      return this.authorizeRoute(state.url);
    }

    return this.auth.validateSession().pipe(
      map(() => this.authorizeRoute(state.url)),
      catchError(() => {
        this.auth.clearSessionState();
        return of(this.router.parseUrl('/login'));
      }),
    );
  }

  private authorizeRoute(url: string): boolean | UrlTree {
    // Perfil ESTOQUE é deliberadamente restrito ao módulo /stock.
    if (
      this.auth.isStockProfile() &&
      !url.startsWith('/stock')
    ) {
      return this.router.parseUrl('/stock/dashboard');
    }

    // Demais perfis mantêm exatamente o comportamento atual.
    return true;
  }
}
