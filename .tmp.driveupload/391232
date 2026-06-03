import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface CashFlowSummary {
    period: { start: string; end: string };
    summary: {
        totalIn: number;
        totalOut: number;
        balance: number;
    };
    accounts: {
        id: string;
        name: string;
        bank: string;
        balance: number;
    }[];
    today: {
        in: number;
        out: number;
    };
    remaining: {
        in: number;
        out: number;
    };
    transactions: any[];
}

@Injectable({
    providedIn: 'root'
})
export class CashFlowService {

    constructor(private api: ApiService) { }

    getCashFlow(startDate?: string, endDate?: string): Observable<CashFlowSummary> {
        let params = '';
        if (startDate && endDate) {
            params = `?startDate=${startDate}&endDate=${endDate}`;
        }
        return this.api.get<CashFlowSummary>(`financial/cash-flow${params}`);
    }
}
