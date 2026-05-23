import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface CostCenter {
    id?: string;
    nome: string;
    codigo?: string | null;
    descricao?: string | null;
    tipo?: string | null;
    categoriaFinanceira?: string | null;
    parentId?: string | null;
    parent?: CostCenter;
    obraId?: string | null;
    obra?: any;
    etapaId?: string | null;
    ativo?: boolean;
    aceitaLancamento?: boolean;
    orcamentoPrevisto?: number | null;
    limiteMaximo?: number | null;
    aprovacaoNecessaria?: boolean;
    responsavelId?: string | null;
    responsavel?: any;
    planoContaId?: string | null;
    planoConta?: any;
    categoriaCompra?: string | null;
    contaContabil?: string | null;
    unidadeMedida?: string | null;
    metaFisica?: number | null;
    tags?: string | null;
    cor?: string | null;
    createdAt?: string;
    updatedAt?: string;
}



@Injectable({
    providedIn: 'root'
})
export class CostCentersService {

    constructor(private api: ApiService) { }

    findAll(): Observable<CostCenter[]> {
        return this.api.get<CostCenter[]>('financial/cost-centers');
    }

    create(data: CostCenter): Observable<CostCenter> {
        return this.api.post<CostCenter>('financial/cost-centers', data);
    }

    update(id: string, data: CostCenter): Observable<CostCenter> {
        return this.api.patch<CostCenter>(`financial/cost-centers/${id}`, data);
    }

    delete(id: string): Observable<any> {
        return this.api.delete(`financial/cost-centers/${id}`);
    }
}
