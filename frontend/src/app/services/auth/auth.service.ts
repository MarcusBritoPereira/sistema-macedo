
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
        this.checkToken();
    }

    checkToken() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            this.isAuthenticated = true;
            this.userSubject.next(JSON.parse(user));
        }
    }

    login(email: string, senha: string) {
        return this.api.post<any>('auth/login', { email, senha }).pipe(
            tap(res => {
                if (res.access_token) {
                    localStorage.setItem('token', res.access_token);

                    if (res.user) {
                        localStorage.setItem('user', JSON.stringify(res.user));
                        this.userSubject.next(res.user);
                    }

                    this.isAuthenticated = true;
                    this.router.navigate(['/home']);
                }
            })
        );
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.isAuthenticated = false;
        this.userSubject.next(null);
        this.router.navigate(['/login']);
    }
}
