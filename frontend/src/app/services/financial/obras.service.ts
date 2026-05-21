import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

export interface Obra {
  id: string;
  nome: string;
  descricao?: string;
  dataInicio?: string;
  dataPrevisaoFim?: string;
  dataConclusao?: string;
  status: 'PLANEJAMENTO' | 'EM_ANDAMENTO' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
  orcamentoPrevisto?: number;
  endereco?: string;
  clienteId?: string;
  centroCustoId?: string;
  ativo: boolean;
  cliente?: { id: string; razaoSocial: string; nomeFantasia?: string };
  centroCusto?: { id: string; nome: string };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ObrasService {
  private apiUrl = `${environment.apiUrl}/financial/obras`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Obra[]> {
    return this.http.get<Obra[]>(this.apiUrl);
  }

  getById(id: string): Observable<Obra> {
    return this.http.get<Obra>(`${this.apiUrl}/${id}`);
  }

  create(obra: Partial<Obra>): Observable<Obra> {
    return this.http.post<Obra>(this.apiUrl, obra);
  }

  update(id: string, obra: Partial<Obra>): Observable<Obra> {
    return this.http.patch<Obra>(`${this.apiUrl}/${id}`, obra);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
