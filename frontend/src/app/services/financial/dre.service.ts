import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { DREParams, DREResult } from './dre';
import { RateioLancamento } from './rateio';

@Injectable({
  providedIn: 'root'
})
export class DreService {
  constructor(private api: ApiService) { }

  gerarDRE(params: DREParams): Observable<DREResult> {
    return this.api.post<DREResult>('financial/dre', params);
  }

  getRateios(transactionId: string): Observable<RateioLancamento[]> {
    return this.api.get<RateioLancamento[]>(`financial/transactions/${transactionId}/rateios`);
  }

  saveRateios(transactionId: string, rateios: RateioLancamento[]): Observable<RateioLancamento[]> {
    return this.api.post<RateioLancamento[]>(`financial/transactions/${transactionId}/rateios`, { rateios });
  }
}
