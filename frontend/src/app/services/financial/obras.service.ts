import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Obra {
  id?: string;
  nome: string;
  descricao?: string;
  dataInicio?: string;
  dataPrevisaoFim?: string;
  dataConclusao?: string;
  status: string;
  orcamentoPrevisto?: number;
  endereco?: string;
  clienteId?: string;
  centroCustoId?: string;
  ativo?: boolean;
  cliente?: any;
  centroCusto?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ObrasService {

  constructor(private api: ApiService) {}

  getAll(): Observable<Obra[]> {
    return this.api.get<Obra[]>('financial/obras');
  }

  getById(id: string): Observable<Obra> {
    return this.api.get<Obra>(`financial/obras/${id}`);
  }

  create(obra: Obra): Observable<Obra> {
    return this.api.post<Obra>('financial/obras', obra);
  }

  update(id: string, obra: Obra): Observable<Obra> {
    return this.api.patch<Obra>(`financial/obras/${id}`, obra);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`financial/obras/${id}`);
  }
}
