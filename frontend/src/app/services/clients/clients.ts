
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Cliente {
  id?: string;
  // 1. Dados Cadastrais (PJ)
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;

  // 2. Representante Legal
  representanteNome?: string;
  representanteCpf?: string;
  representanteCargo?: string;
  representanteEmail?: string;
  representanteTelefone?: string;

  // 3. Responsável Financeiro
  financeiroNome?: string;
  financeiroEmail?: string;
  financeiroWhatsapp?: string;
  financeiroPreferenciaContato?: string;

  // 4. Dados Operacionais
  redesSociais?: any; // Json
  usuariosAdmins?: string;
  linksUteis?: any; // Json

  // 5. Dados Fiscais
  emissaoNf?: boolean;
  emailNf?: string;
  obsFiscais?: string;

  // 6. Dados Jurídicos
  foro?: string;
  lgpdAceito?: boolean;
  aceiteEletronico?: boolean;

  ativo?: boolean;
}

export interface ClientExecutiveDTO extends Cliente {
  revenue: number;
  durationMonths: number;
  healthScore: 'GOOD' | 'ATTENTION' | 'RISK';
  planType: string;
  dataInicio: Date;
  dataTermino: Date | null;
  tempoRestanteDias: number | null;
  statusDisplay: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientsService {

  constructor(private api: ApiService) { }

  findAll(): Observable<Cliente[]> {
    return this.api.get<Cliente[]>('clients');
  }

  getExecutiveData(): Observable<ClientExecutiveDTO[]> {
    return this.api.get<ClientExecutiveDTO[]>('clients/executive');
  }

  findOne(id: string): Observable<Cliente> {
    return this.api.get<Cliente>(`clients/${id}`);
  }

  create(cliente: Cliente): Observable<Cliente> {
    return this.api.post<Cliente>('clients', cliente);
  }

  createMany(clientes: Cliente[]): Observable<any> {
    return this.api.post<any>('clients/bulk', clientes);
  }

  update(id: string, cliente: Cliente): Observable<Cliente> {
    return this.api.patch<Cliente>(`clients/${id}`, cliente);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`clients/${id}`);
  }

  getKpis(): Observable<{ activeClients: number; churnCount: number; avgLtv: number; avgLifetimeMonths: number }> {
    return this.api.get<{ activeClients: number; churnCount: number; avgLtv: number; avgLifetimeMonths: number }>('clients/kpis');
  }
}
