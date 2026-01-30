import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface FinancialBudget {
    id?: string;
    mes: number;
    ano: number;
    receitaMeta: number;
    despesaMeta: number;
}

@Injectable({
    providedIn: 'root'
})
export class FinancialBudgetService {

    constructor(private api: ApiService) { }

    getBudgets(year: number): Observable<FinancialBudget[]> {
        const params = { ano: year.toString() };
        return this.api.get<FinancialBudget[]>('financial/budget', params);
    }

    upsertBudget(budget: { mes: number; ano: number; receitaMeta: number; despesaMeta: number }): Observable<FinancialBudget> {
        return this.api.post<FinancialBudget>('financial/budget', budget);
    }
}
