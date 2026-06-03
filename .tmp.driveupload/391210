import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';

export interface AuditLogItem {
    id: string;
    data: string;
    acao: string;
    tabela?: string;
    registroId?: string;
    valorAntigo?: string;
    valorNovo?: string;
    motivo: string;
    usuarioId: string;
    usuario: {
        nome: string;
        email: string;
    };
}

export interface AuditLogResponse {
    items: AuditLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    constructor(private api: ApiService) { }

    getLogs(params: {
        page?: number;
        limit?: number;
        search?: string;
        startDate?: string;
        endDate?: string;
    }): Observable<AuditLogResponse> {
        return this.api.get<AuditLogResponse>('audit-log', params);
    }
}
