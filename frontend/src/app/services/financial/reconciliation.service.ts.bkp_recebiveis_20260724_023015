
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { BankStatement, SuggestedMatch, PaginatedStatementsResponse } from './reconciliation';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService {
    constructor(private api: ApiService) { }

    getStatements(contaId: string, filters?: any): Observable<PaginatedStatementsResponse> {
        let query = '';
        if (filters) {
            const parts = [];
            if (filters.startDate) parts.push(`startDate=${filters.startDate}`);
            if (filters.endDate) parts.push(`endDate=${filters.endDate}`);
            if (filters.status) parts.push(`status=${filters.status}`);
            if (filters.search) parts.push(`search=${encodeURIComponent(filters.search)}`);
            if (filters.categoryId) parts.push(`categoryId=${filters.categoryId}`);
            if (filters.page) parts.push(`page=${filters.page}`);
            if (filters.pageSize) parts.push(`pageSize=${filters.pageSize}`);
            if (parts.length > 0) query = `?${parts.join('&')}`;
        }
        return this.api.get<PaginatedStatementsResponse>(`financial/reconciliation/statements/${contaId}${query}`);
    }

    getSuggestedMatches(statementId: string): Observable<SuggestedMatch[]> {
        return this.api.get<SuggestedMatch[]>(`financial/reconciliation/suggested-matches/${statementId}`);
    }

    linkManual(statementId: string, lancamentoId: string, confirmacaoManual: boolean = false): Observable<any> {
        return this.api.post('financial/reconciliation/link', { statementId, lancamentoId, confirmacaoManual });
    }

    createAndLink(statementId: string, data: any, confirmacaoManual: boolean = false): Observable<any> {
        return this.api.post('financial/reconciliation/create-and-link', { statementId, confirmacaoManual, ...data });
    }

    unlink(conciliacaoId: string): Observable<any> {
        return this.api.delete(`financial/reconciliation/unlink/${conciliacaoId}`);
    }

    sync(contaId: string): Observable<any> {
        return this.api.post(`financial/banking/sync/${contaId}`, {});
    }

    zeroPending(contaBancariaId: string, year: number, month: number): Observable<any> {
        return this.api.post('financial/reconciliation/zero-pending', { contaBancariaId, year, month });
    }
}
