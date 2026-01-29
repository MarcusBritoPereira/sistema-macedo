
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { BankStatement, SuggestedMatch } from './reconciliation';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationService {
    constructor(private api: ApiService) { }

    getStatements(contaId: string, filters?: any): Observable<BankStatement[]> {
        let query = '';
        if (filters) {
            const parts = [];
            if (filters.startDate) parts.push(`startDate=${filters.startDate}`);
            if (filters.endDate) parts.push(`endDate=${filters.endDate}`);
            if (filters.status) parts.push(`status=${filters.status}`);
            if (parts.length > 0) query = `?${parts.join('&')}`;
        }
        return this.api.get<BankStatement[]>(`financial/reconciliation/statements/${contaId}${query}`);
    }

    getSuggestedMatches(statementId: string): Observable<SuggestedMatch[]> {
        return this.api.get<SuggestedMatch[]>(`financial/reconciliation/suggested-matches/${statementId}`);
    }

    linkManual(statementId: string, lancamentoId: string): Observable<any> {
        return this.api.post('financial/reconciliation/link', { statementId, lancamentoId });
    }

    createAndLink(statementId: string, data: any): Observable<any> {
        return this.api.post('financial/reconciliation/create-and-link', { statementId, ...data });
    }

    unlink(conciliacaoId: string): Observable<any> {
        return this.api.delete(`financial/reconciliation/unlink/${conciliacaoId}`);
    }

    sync(contaId: string): Observable<any> {
        return this.api.post(`financial/banking/sync/${contaId}`, {});
    }
}
