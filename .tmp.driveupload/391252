import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Supplier {
    id?: string;
    nomeFantasia: string;
    razaoSocial?: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    categoriaDefaultId?: string;
    ativo?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class SuppliersService {

    constructor(private api: ApiService) { }

    findAll(): Observable<Supplier[]> {
        return this.api.get<Supplier[]>('suppliers');
    }

    create(supplier: Supplier): Observable<Supplier> {
        return this.api.post<Supplier>('suppliers', supplier);
    }

    update(id: string, supplier: Supplier): Observable<Supplier> {
        return this.api.patch<Supplier>(`suppliers/${id}`, supplier);
    }

    delete(id: string): Observable<void> {
        return this.api.delete<void>(`suppliers/${id}`);
    }

    getById(id: string): Observable<Supplier> {
        return this.api.get<Supplier>(`suppliers/${id}`);
    }
}
