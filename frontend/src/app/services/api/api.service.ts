
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private getHeaders(body?: any) {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();

        // Only set Content-Type: application/json if body is NOT FormData
        if (!(body instanceof FormData)) {
            headers = headers.set('Content-Type', 'application/json');
        }

        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    get<T>(endpoint: string, params?: any) {
        return this.http.get<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getHeaders(), params });
    }

    post<T>(endpoint: string, body: any) {
        return this.http.post<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getHeaders(body) });
    }

    put<T>(endpoint: string, body: any) {
        return this.http.put<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getHeaders(body) });
    }

    patch<T>(endpoint: string, body: any) {
        return this.http.patch<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getHeaders(body) });
    }

    delete<T>(endpoint: string) {
        return this.http.delete<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getHeaders() });
    }
}
