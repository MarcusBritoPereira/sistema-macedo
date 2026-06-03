import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Recurrence {
    id?: string;
    frequencia: 'MENSAL' | 'SEMANAL' | 'ANUAL' | 'DIARIO';
    dataInicio: string;
    dataFim?: string;
    diaVencimento?: number;
    sourceTransactionId: string;
}

@Injectable({
    providedIn: 'root'
})
export class RecurringService {

    constructor(private api: ApiService) { }

    create(data: Recurrence): Observable<any> {
        return this.api.post('financial/recurring', data);
    }

    process(): Observable<any> {
        return this.api.post('financial/recurring/process', {});
    }
}
