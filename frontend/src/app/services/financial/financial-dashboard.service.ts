import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service'; // Fix: Relative path within services folder
import { Observable } from 'rxjs';

export interface DREResponse {
    period: { start: string; end: string };
    breakdown: any;
    summary: {
        receitaBruta: number;
        deducoes: number;
        receitaLiquida: number;
        csp: number;
        lucroBruto: number;
        despesasOperacionais: number;
        ebit: number;
        resultadoFinanceiro: number;
        lair: number;
        impostosLucro: number;
        lucroLiquido: number;
    };
}

export interface ExecutiveDashboardResponse {
    kpis: {
        totalReceita: number;
        totalDespesas: number;
        contasReceber: number;
        contasPagar: number;
        lucroLiquido: number;
        margemLucro: number;
        saldoFinal: number;
        liquidezReduzida: number;
        liquidezGeral: number;
    };
    budget: {
        receitaMeta: number;
        despesaMeta: number;
        receitaPct: number;
        despesaPct: number;
    };
    history: {
        label: string;
        receita: number;
        despesa: number;
        lucro: number;
    }[];
}

export interface OperationalDashboardResponse {
    receivables: {
        overdue: number;
        today: number;
        remainingMonth: number;
    };
    payables: {
        overdue: number;
        today: number;
        remainingMonth: number;
    };
    accounts: {
        id: string;
        nome: string;
        banco: string;
        saldo: number;
    }[];
    totalBalance: number;
    dailyFlow: {
        date: string;
        label: string;
        recebimentos: number;
        pagamentos: number;
        saldo: number;
    }[];
    lastUpdate: string;
}

export interface BalanceSheetResponse {
    asOf: string;
    assets: {
        cashAndBanks: number;
        accountsReceivable: number;
        total: number;
        accounts: {
            id: string;
            nome: string;
            banco: string;
            saldo: number;
        }[];
    };
    liabilities: {
        accountsPayable: number;
        total: number;
    };
    equity: {
        total: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class FinancialDashboardService {

    constructor(private api: ApiService) { }

    getDRE(startDate: string, endDate: string): Observable<DREResponse> {
        return this.api.get<DREResponse>(`financial/dashboard/dre?startDate=${startDate}&endDate=${endDate}`);
    }

    getExecutiveDashboard(month: number, year: number): Observable<ExecutiveDashboardResponse> {
        return this.api.get<ExecutiveDashboardResponse>(`financial/dashboard/executive?month=${month}&year=${year}`);
    }

    getOperationalDashboard(): Observable<OperationalDashboardResponse> {
        return this.api.get<OperationalDashboardResponse>(`financial/dashboard/operational`);
    }

    getBalanceSheet(asOf?: string): Observable<BalanceSheetResponse> {
        const query = asOf ? `?asOf=${asOf}` : '';
        return this.api.get<BalanceSheetResponse>(`financial/dashboard/balance${query}`);
    }
}
