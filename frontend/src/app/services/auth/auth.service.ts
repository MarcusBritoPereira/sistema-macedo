
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private userSubject = new BehaviorSubject<any>(null);
    user$ = this.userSubject.asObservable();
    isAuthenticated = false;

    constructor(private api: ApiService, private router: Router) {
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
            tap(res => {
                if (res.user) {
                    sessionStorage.setItem('user', JSON.stringify(res.user));
                    this.userSubject.next(res.user);
                    this.isAuthenticated = true;
                    // Só redireciona se não precisar trocar a senha
                    if (!res.user.precisaTrocarSenha) {
                        window.location.href = '/financial/dashboard';
                    }
                }
            })
        );
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
            })
        );
    }

    logout() {
        this.api.post('auth/logout', {}).subscribe({ error: () => null });
        sessionStorage.removeItem('user');
        this.isAuthenticated = false;
        this.userSubject.next(null);
        this.router.navigate(['/login']);
    }
}
