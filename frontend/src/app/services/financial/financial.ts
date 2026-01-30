
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';


export interface Transaction {
  id?: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  tipo: 'RECEITA' | 'DESPESA';
  status: 'PREVISTO' | 'REALIZADO' | 'CONCILIADO' | 'CANCELADO';
  categoriaId?: string;
  centroCustoId?: string;
  contratoId?: string;
  clienteId?: string;
  formaPagamento?: string;
  condicaoPagamento?: string; // 'A_VISTA', 'PARCELADO'
  contaBancariaId?: string;
  dataCompetencia?: string;
  codigoReferencia?: string;
  nsu?: string;
  habilitarRateio?: boolean;
  observacoes?: string;
  anexoUrl?: string; // Placeholder for attachment
  fornecedor?: any; // Can be string (legacy) or Supplier object
  fornecedorId?: string; // New relation
  fornecedorObj?: { nomeFantasia: string }; // Optional included relation
  runningBalance?: number;
  createdAt?: string;
}

export interface BankAccount {
  id: string;
  nome: string;
  banco: string;
  agencia?: string;
  conta?: string;
  codigoBanco?: string;
  pendingReconciliations?: number;
  lastSync?: string | Date;
  lastImported?: string | Date;
  saldoInicial?: number;
  saldoAtual?: number;
  integracao?: {
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  };
}

@Injectable({
  providedIn: 'root'
})
export class FinancialService {

  constructor(private api: ApiService) { }

  getBankAccounts(): Observable<BankAccount[]> {
    return this.api.get<BankAccount[]>('financial/bank-accounts');
  }

  deleteBankAccount(id: string): Observable<any> {
    return this.api.delete(`financial/bank-accounts/${id}`);
  }

  createBankAccount(data: Partial<BankAccount>): Observable<BankAccount> {
    return this.api.post<BankAccount>('financial/bank-accounts', data);
  }

  getTransactions(filters?: { tipo?: 'RECEITA' | 'DESPESA', status?: string, categoryId?: string }): Observable<Transaction[]> {
    const queryParts: string[] = [];
    if (filters) {
      if (filters.tipo) queryParts.push(`tipo=${filters.tipo}`);
      if (filters.status) queryParts.push(`status=${filters.status}`);
      if (filters.categoryId) queryParts.push(`categoryId=${filters.categoryId}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.api.get<Transaction[]>(`financial/transactions${queryString}`);
  }

  getTransaction(id: string): Observable<Transaction> {
    return this.api.get<Transaction>(`financial/transactions/${id}`);
  }

  createTransaction(data: Transaction): Observable<Transaction> {
    return this.api.post<Transaction>('financial/transactions', data);
  }

  updateTransaction(id: string, data: Partial<Transaction>): Observable<Transaction> {
    return this.api.patch<Transaction>(`financial/transactions/${id}`, data);
  }

  deleteTransaction(id: string): Observable<any> {
    return this.api.delete(`financial/transactions/${id}`);
  }

  getCategories(): Observable<any[]> {
    return this.api.get<any[]>('financial/categories');
  }

  getCostCenters(): Observable<any[]> {
    return this.api.get<any[]>('financial/cost-centers');
  }

  // --- Legacy Adapters (Optional, but better to refactor components) ---
  // If we want to allow components to compile while we fix them one by one.
  // But strict refactor is better. I will remove legacy methods to force compilation errors 
  // and find all usages.
}
