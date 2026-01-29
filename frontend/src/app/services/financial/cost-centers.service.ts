import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface CostCenter {
    id?: string;
    nome: string;
    codigo?: string;
    descricao?: string;
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
