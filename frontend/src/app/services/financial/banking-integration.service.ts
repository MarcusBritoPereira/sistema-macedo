
import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface BankingConfiguration {
    contaBancariaId: string;
    banco: string; // 'INTER'
    apiKey: string;
    clientId?: string;
    clientSecret?: string;
}

export interface BankingStatus {
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'NOT_CONFIGURED';
    lastSync?: string;
    banco?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BankingIntegrationService {

    constructor(private api: ApiService) { }

    configure(config: FormData): Observable<any> {
        return this.api.post('financial/banking/configure', config);
    }

    getStatus(contaBancariaId: string): Observable<BankingStatus> {
        return this.api.get<BankingStatus>(`financial/banking/status/${contaBancariaId}`);
    }

    sync(contaBancariaId: string): Observable<any> {
        return this.api.post(`financial/banking/sync/${contaBancariaId}`, {});
    }

    uploadOfx(file: File, contaBancariaId: string): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('contaId', contaBancariaId);
        return this.api.post('financial/banking/upload-ofx', formData);
    }

    uploadCsv(file: File, contaBancariaId: string): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('contaId', contaBancariaId);
        return this.api.post('financial/banking/upload-csv', formData);
    }
}
