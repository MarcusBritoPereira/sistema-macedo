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

export interface ParcelaObra {
  id?: string;
  obraId: string;
  porcentagem?: number;
  valor: number;
  dataVencimento: string;
  descricao?: string;
  status: string;
  transacaoId?: string;
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

  // Parcelas
  getParcelas(obraId: string): Observable<ParcelaObra[]> {
    return this.api.get<ParcelaObra[]>(`financial/obras/${obraId}/parcelas`);
  }

  createParcela(obraId: string, parcela: Partial<ParcelaObra>): Observable<ParcelaObra> {
    return this.api.post<ParcelaObra>(`financial/obras/${obraId}/parcelas`, parcela);
  }

  updateParcela(obraId: string, parcelaId: string, parcela: Partial<ParcelaObra>): Observable<ParcelaObra> {
    return this.api.patch<ParcelaObra>(`financial/obras/${obraId}/parcelas/${parcelaId}`, parcela);
  }

  deleteParcela(obraId: string, parcelaId: string): Observable<any> {
    return this.api.delete(`financial/obras/${obraId}/parcelas/${parcelaId}`);
  }
}
