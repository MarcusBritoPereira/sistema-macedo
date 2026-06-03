
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { Cliente } from '../clients/clients';

export interface Contrato {
  id?: string;
  descricao: string;

  // New Fields
  tipo?: string; // 'RECORRENTE' | 'PROJETO'
  valorMensal: number | string;
  quantidadeParcelas?: number;
  diaVencimento?: number;
  formaPagamento?: string;
  multaJuros?: string;

  dataInicio: string;
  dataFim: string;
  ativo?: boolean;
  status?: 'ATIVO' | 'VENCIDO' | 'CANCELADO' | 'RENOVADO';
  clienteId: string;
  cliente?: Cliente;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractsService {

  constructor(private api: ApiService) { }

  findAll(): Observable<Contrato[]> {
    return this.api.get<Contrato[]>('contracts');
  }

  findOne(id: string): Observable<Contrato> {
    return this.api.get<Contrato>(`contracts/${id}`);
  }

  create(contrato: Contrato): Observable<Contrato> {
    return this.api.post<Contrato>('contracts', contrato);
  }

  update(id: string, contrato: Contrato): Observable<Contrato> {
    return this.api.patch<Contrato>(`contracts/${id}`, contrato);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`contracts/${id}`);
  }

  generateFinancial(id: string): Observable<any> {
    return this.api.post(`contracts/${id}/generate`, {});
  }
}
