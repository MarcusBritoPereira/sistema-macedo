import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RestrictedFinancialGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.hasPermission('financeiro.relatorios.read')) {
      return this.router.parseUrl('/financial/dashboard');
    }

    return true;
  }
}
