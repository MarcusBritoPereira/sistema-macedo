
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Usuario {
  id?: string;
  nome: string;
  email: string;
  senha?: string;
  perfil: { nome: string } | string; // Handle both cases
  ativo?: boolean;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(private api: ApiService) { }

  findAll(): Observable<Usuario[]> {
    return this.api.get<Usuario[]>('users');
  }

  findOne(id: string): Observable<Usuario> {
    return this.api.get<Usuario>(`users/${id}`);
  }

  create(usuario: Usuario): Observable<Usuario> {
    return this.api.post<Usuario>('users', usuario);
  }

  update(id: string, usuario: Usuario): Observable<Usuario> {
    return this.api.patch<Usuario>(`users/${id}`, usuario);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`users/${id}`);
  }
}
