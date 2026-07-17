import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudDownloadOutline, pieChartOutline, refreshOutline } from 'ionicons/icons';
import { StockReportKind, StockService } from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonSpinner],
  templateUrl: './stock-reports.page.html',
  styleUrls: ['./stock-reports.page.scss']
})
export class StockReportsPage {
  loading = false;
  kind: StockReportKind = 'position';
  dataInicio = '';
  dataFim = '';
  items: any[] = [];
  headers: string[] = [];

  reports = [
    { value: 'position', label: 'Posição de estoque' },
    { value: 'movements', label: 'Movimentações' },
    { value: 'consumption-by-project', label: 'Consumo por obra' },
    { value: 'losses', label: 'Perdas e desperdícios' },
    { value: 'abc', label: 'Curva ABC' },
    { value: 'purchase-suggestion', label: 'Sugestão de compra' },
  ];

  constructor(private stock: StockService) {
    addIcons({ cloudDownloadOutline, pieChartOutline, refreshOutline });
  }

  load(): void {
    this.loading = true;
    this.stock.getReport(this.kind, this.params()).subscribe({
      next: response => {
        this.items = response.items || [];
        this.headers = this.items.length ? Object.keys(this.items[0]) : [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  exportCsv(): void {
    this.stock.getReport(this.kind, { ...this.params(), formato: 'csv', take: 1000 }).subscribe(response => {
      const blob = new Blob([response.content || ''], { type: response.mimeType || 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = response.filename || `${this.kind}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  private params(): any {
    return {
      take: 100,
      ...(this.dataInicio ? { dataInicio: this.dataInicio } : {}),
      ...(this.dataFim ? { dataFim: this.dataFim } : {}),
    };
  }
}
