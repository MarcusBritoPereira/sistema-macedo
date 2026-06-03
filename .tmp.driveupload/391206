import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface MonthlyClosingStatus {
    status: 'ABERTO' | 'FECHADO';
    saldoFinal: number;
    mes: number;
    ano: number;
}

@Injectable({
    providedIn: 'root'
})
export class MonthlyClosingService {

    constructor(private api: ApiService) { }

    getClosingStatus(month: number, year: number): Observable<MonthlyClosingStatus> {
        return this.api.get<MonthlyClosingStatus>(`financial/closing/status?month=${month}&year=${year}`);
    }

    closeMonth(month: number, year: number): Observable<MonthlyClosingStatus> {
        return this.api.post<MonthlyClosingStatus>('financial/closing', { month, year });
    }
}
