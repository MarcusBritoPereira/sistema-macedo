
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import {
    BankStatement,
    SuggestedMatch,
    PaginatedStatementsResponse,
    OpenReceivable,
    OpenPayable
} from './reconciliation';

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

    getOpenReceivables(filters?: {
        clienteId?: string;
        search?: string;
    }): Observable<OpenReceivable[]> {
        const parts: string[] = [];

        if (filters?.clienteId) {
            parts.push(`clienteId=${encodeURIComponent(filters.clienteId)}`);
        }

        if (filters?.search) {
            parts.push(`search=${encodeURIComponent(filters.search)}`);
        }

        const query = parts.length ? `?${parts.join('&')}` : '';

        return this.api.get<OpenReceivable[]>(
            `financial/reconciliation/receivables/open${query}`
        );
    }

    linkReceivablePayment(
        statementId: string,
        lancamentoId: string,
        confirmacaoManual: boolean = false
    ): Observable<any> {
        return this.api.post(
            'financial/reconciliation/receivable-payment',
            {
                statementId,
                lancamentoId,
                confirmacaoManual
            }
        );
    }

    getOpenPayables(filters?: {
        fornecedorId?: string;
        search?: string;
    }): Observable<OpenPayable[]> {
        const parts: string[] = [];

        if (filters?.fornecedorId) {
            parts.push(`fornecedorId=${encodeURIComponent(filters.fornecedorId)}`);
        }

        if (filters?.search) {
            parts.push(`search=${encodeURIComponent(filters.search)}`);
        }

        const query = parts.length ? `?${parts.join('&')}` : '';

        return this.api.get<OpenPayable[]>(
            `financial/reconciliation/payables/open${query}`
        );
    }

    linkPayablePayment(
        statementId: string,
        lancamentoId: string,
        confirmacaoManual: boolean = false
    ): Observable<any> {
        return this.api.post(
            'financial/reconciliation/payable-payment',
            {
                statementId,
                lancamentoId,
                confirmacaoManual
            }
        );
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

    createManualStatement(contaBancariaId: string, data: string, descricao: string, valor: number, tipo: 'CREDIT' | 'DEBIT'): Observable<any> {
        return this.api.post('financial/reconciliation/manual-statement', {
            contaBancariaId,
            data,
            descricao,
            valor,
            tipo
        });
    }

    updateManualStatement(id: string, data: any): Observable<any> {
        return this.api.post(`financial/reconciliation/manual-statement/${id}`, data);
    }

    deleteManualStatement(id: string): Observable<any> {
        return this.api.delete(`financial/reconciliation/manual-statement/${id}`);
    }
}
