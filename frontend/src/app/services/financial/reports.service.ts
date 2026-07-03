import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  cadence: string;
  category: string;
  tags: string[];
  icon: string;
  highlights: string[];
  defaultSelected?: boolean;
}

export interface ReportGenerationRequest {
  reportIds: string[];
  filters: {
    period: string;
    startDate?: string | null;
    endDate?: string | null;
    accountId?: string | null;
    costCenterId?: string | null;
    includeProvisional?: boolean;
  };
}

export interface ReportGenerationResponse {
  generatedAt: string;
  count: number;
  message?: string;
  reports: Array<{ id: string; title: string; status: string; data?: any }>;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  constructor(private api: ApiService) { }

  getReports(): Observable<ReportDefinition[]> {
    return this.api.get<ReportDefinition[]>('financial/reports');
  }

  generateReports(payload: ReportGenerationRequest): Observable<ReportGenerationResponse> {
    return this.api.post<ReportGenerationResponse>('financial/reports/generate', payload);
  }

  getDashboardData(filters: any): Observable<any> {
    const queryParts: string[] = [];
    if (filters) {
      if (filters.obraId) queryParts.push(`obraId=${filters.obraId}`);
      if (filters.centroCustoId) queryParts.push(`centroCustoId=${filters.centroCustoId}`);
      if (filters.startDate) queryParts.push(`startDate=${filters.startDate}`);
      if (filters.endDate) queryParts.push(`endDate=${filters.endDate}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.api.get<any>(`financial/reports/dashboard${queryString}`);
  }
}
