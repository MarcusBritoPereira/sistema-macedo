import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import {
  BehaviorSubject,
  finalize,
  map,
  Observable,
  shareReplay,
  tap,
} from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();
  isAuthenticated = false;
  private refreshRequest?: Observable<any>;

  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    this.checkSession();
  }

  checkSession() {
    const user = sessionStorage.getItem('user');
    if (!user) return;
    try {
      this.userSubject.next(JSON.parse(user));
      this.isAuthenticated = true;
    } catch {
      this.logout();
    }
  }

  login(email: string, senha: string) {
    return this.api.post<any>('auth/login', { email, senha }).pipe(
      tap((res) => {
        if (res.user) {
          sessionStorage.setItem('user', JSON.stringify(res.user));
          this.userSubject.next(res.user);
          this.isAuthenticated = true;
          // Só redireciona se não precisar trocar a senha
          if (!res.user.precisaTrocarSenha) {
            window.location.href = '/financial/dashboard';
          }
        }
      }),
    );
  }

  validateSession(): Observable<boolean> {
    return this.api.get<any>('auth/me').pipe(
      tap((res) => {
        if (res.user) {
          sessionStorage.setItem('user', JSON.stringify(res.user));
          this.userSubject.next(res.user);
          this.isAuthenticated = true;
        }
      }),
      map(() => true),
    );
  }

  refreshSession(): Observable<any> {
    if (!this.refreshRequest) {
      this.refreshRequest = this.api.post<any>('auth/refresh', {}).pipe(
        shareReplay(1),
        finalize(() => (this.refreshRequest = undefined)),
      );
    }
    return this.refreshRequest;
  }

  changePassword(novaSenha: string) {
    return this.api.patch<any>('auth/change-password', { novaSenha }).pipe(
      tap(() => {
        const user = this.userSubject.value;
        if (user) {
          user.precisaTrocarSenha = false;
          sessionStorage.setItem('user', JSON.stringify(user));
          this.userSubject.next(user);
        }
      }),
    );
  }

  clearSessionState() {
    sessionStorage.removeItem('user');
    this.isAuthenticated = false;
    this.userSubject.next(null);
  }

  hasPermission(
    permission: string,
    user: any = this.userSubject.value,
  ): boolean {
    if (!user) return false;

    const userPerms = user.permissoes;
    // Se as permissões foram customizadas (salvas como um objeto true/false)
    if (userPerms && typeof userPerms === 'object' && !Array.isArray(userPerms)) {
      if (userPerms[permission] !== undefined) {
        return userPerms[permission] === true;
      }
    }

    if (user?.perfil?.nome === 'ADMINISTRADOR' || user?.perfil?.nome === 'ADMIN') return true;

    if (Array.isArray(userPerms) && userPerms.includes(permission)) return true;

    const permissoes = user?.perfil?.permissoes;
    if (!permissoes) return false;
    if (permissoes.all === true) return true;
    if (Array.isArray(permissoes)) return permissoes.includes(permission);
    if (permissoes[permission] === true) return true;
    return (
      permissoes.financial === true &&
      (permission.startsWith('financeiro.') ||
        permission === 'can_reconcile' ||
        permission === 'can_manage_banking')
    );
  }

  logout() {
    this.api.post('auth/logout', {}).subscribe({ error: () => null });
    this.clearSessionState();
    this.router.navigate(['/login']);
  }
}
