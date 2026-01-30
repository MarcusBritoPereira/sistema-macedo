
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

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
            try {
                const decoded: any = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decoded.exp < currentTime) {
                    this.logout();
                } else {
                    this.isAuthenticated = true;
                    this.userSubject.next(JSON.parse(user));
                }
            } catch (error) {
                this.logout();
            }
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
