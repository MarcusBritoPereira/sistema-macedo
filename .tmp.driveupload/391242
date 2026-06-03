
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
        let headers = new HttpHeaders();

        // Only set Content-Type: application/json if body is NOT FormData
        if (!(body instanceof FormData)) {
            headers = headers.set('Content-Type', 'application/json');
        }

        return headers;
    }

    get<T>(endpoint: string, params?: any) {
        return this.http.get<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getHeaders(), params, withCredentials: true });
    }

    post<T>(endpoint: string, body: any) {
        return this.http.post<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getHeaders(body), withCredentials: true });
    }

    put<T>(endpoint: string, body: any) {
        return this.http.put<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getHeaders(body), withCredentials: true });
    }

    patch<T>(endpoint: string, body: any) {
        return this.http.patch<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getHeaders(body), withCredentials: true });
    }

    delete<T>(endpoint: string) {
        return this.http.delete<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getHeaders(), withCredentials: true });
    }
}
