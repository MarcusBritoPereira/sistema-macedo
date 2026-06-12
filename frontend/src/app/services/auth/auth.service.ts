import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { BehaviorSubject, finalize, Observable, shareReplay, tap } from 'rxjs';
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

  isJessicaUser(user: any = this.userSubject.value): boolean {
    const email = user?.email?.toLowerCase?.() || '';
    const nome = user?.nome?.toLowerCase?.() || '';

    return email === 'engjessicamiranda91@gmail.com' || nome.includes('jessica') || nome.includes('jéssica');
  }

  logout() {
    this.api.post('auth/logout', {}).subscribe({ error: () => null });
    this.clearSessionState();
    this.router.navigate(['/login']);
  }
}
