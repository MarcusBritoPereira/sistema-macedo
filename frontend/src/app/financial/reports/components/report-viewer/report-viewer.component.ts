import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { printOutline, downloadOutline, closeOutline, trendingUpOutline, trendingDownOutline } from 'ionicons/icons';

export interface ReportRow {
  label: string;
  value: number;
  level: number; // 0=Total/Main, 1=Group, 2=Detail
  type?: 'total' | 'header' | 'data';
  highlight?: boolean;
}

export interface ReportData {
  summary: any;
  details: ReportRow[];
}

@Component({
  selector: 'app-report-viewer',
  template: `
    <div class="report-container" *ngIf="data">
      <div class="report-toolbar no-print">
        <div class="report-toolbar-titles">
          <h1>{{ title }}</h1>
          <h2>Mês: {{ period || 'N/A' }}</h2>
          <h2>Empresa: Up Finance</h2>
        </div>
        <div class="actions-toolbar">
          <ion-button fill="outline" size="small" (click)="downloadCSV()">
            <ion-icon name="download-outline" slot="start"></ion-icon>
            Exportar
          </ion-button>
          <ion-button fill="clear" size="small" (click)="closeReport()" color="medium">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
      </div>

      <!-- EXECUTIVE SUMMARY CARDS -->
      <div class="executive-summary" *ngIf="isDRE">
        <ion-card class="summary-card">
          <div class="card-title">Receita Líquida</div>
          <div class="card-value value-blue">{{ (data.summary?.receitaLiquida || 0) | currency:'BRL' }}</div>
          <div class="card-indicator">
            <ion-icon name="trending-up-outline" color="primary"></ion-icon>
            <span>{{ metrics.recurrence | number:'1.0-0' }}% recorrente</span>
          </div>
        </ion-card>

        <ion-card class="summary-card">
          <div class="card-title">Lucro Bruto</div>
          <div class="card-value value-green">{{ (data.summary?.lucroBruto || 0) | currency:'BRL' }}</div>
          <div class="card-indicator">
            <span class="indicator-chip neutral">Margem: {{ metrics.grossMargin | number:'1.0-0' }}%</span>
          </div>
        </ion-card>

        <ion-card class="summary-card">
          <div class="card-title">EBITDA</div>
          <div class="card-value value-green">{{ (data.summary?.ebitda || 0) | currency:'BRL' }}</div>
          <div class="card-indicator">
            <ion-icon *ngIf="metrics.ebitdaMargin >= 0" name="trending-up-outline" color="success"></ion-icon>
            <ion-icon *ngIf="metrics.ebitdaMargin < 0" name="trending-down-outline" color="danger"></ion-icon>
            <span class="indicator-chip" [class.positive]="metrics.ebitdaMargin >= 0" [class.negative]="metrics.ebitdaMargin < 0">
              Margem: {{ metrics.ebitdaMargin | number:'1.0-0' }}%
            </span>
          </div>
        </ion-card>

        <ion-card class="summary-card">
          <div class="card-title">Lucro Líquido</div>
          <div class="card-value" [ngClass]="metrics.netProfit >= 0 ? 'value-green' : 'value-red'">
            {{ (data.summary?.lucroLiquido || 0) | currency:'BRL' }}
          </div>
          <div class="card-indicator">
            <span class="indicator-chip" [class.positive]="metrics.netMargin >= 0" [class.negative]="metrics.netMargin < 0">
              Margem: {{ metrics.netMargin | number:'1.0-0' }}%
            </span>
          </div>
        </ion-card>
      </div>

      <!-- DRE BODY OR GENERAL REPORT BODY -->
      <div class="report-body">
        <ng-container *ngFor="let row of processedRows">
          
          <!-- Section Headers / Block Titles -->
          <div *ngIf="row.isSectionHeader" class="section-title">
            <ion-icon name="bookmark" color="primary"></ion-icon>
            {{ row.sectionName | uppercase }}
          </div>

          <!-- Normal Rows -->
          <div class="report-row" 
               [class.level-0]="row.level === 0"
               [class.level-1]="row.level === 1"
               [class.level-2]="row.level === 2"
               [class.total-row]="row.type === 'total'"
               [class.profit-row]="row.isProfit"
               [class.ebitda-row]="row.isEbitda"
               [class.net-profit-row]="row.isNetProfit">
            
            <div class="label-col">
              <span class="indentation" *ngIf="row.level > 0"></span>
              {{ row.label }}
            </div>
            
            <div class="value-col" [class.negative-value]="row.value < 0" [class.positive-value]="row.value > 0 && row.isProfit">
              {{ row.value < 0 ? '-' : '' }}{{ abs(row.value) | currency:'BRL' }}
            </div>
          </div>
        </ng-container>
      </div>

    </div>
  `,
  styles: [`
    /* Base Configs */
    .report-container {
      background: #FAFAFA;
      padding: 24px;
      font-family: 'Inter', 'Roboto', sans-serif;
      color: #333;
    }

    /* 1. Header */
    .report-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #E0E0E0;

      .report-toolbar-titles {
        h1 {
          font-size: 24px;
          font-weight: 700;
          color: #212121;
          margin: 0 0 4px 0;
          letter-spacing: -0.5px;
        }
        h2 {
          font-size: 14px;
          font-weight: 500;
          color: #616161;
          margin: 2px 0;
        }
      }

      .actions-toolbar {
        display: flex;
        gap: 8px;

        ion-button[fill="outline"] {
          --color: #1976D2;
          --border-color: #1976D2;
          --border-radius: 8px;
          --border-width: 1px;
          font-weight: 600;
          text-transform: none;
        }
      }
    }

    /* 2. Executive Summary Cards */
    .executive-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;

      .summary-card {
        background: #FFFFFF;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02);
        padding: 16px;
        margin: 0;

        .card-title {
          font-size: 13px;
          font-weight: 600;
          color: #616161;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .card-value {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 12px;
        }

        .value-blue { color: #1976D2; }
        .value-green { color: #2E7D32; }
        .value-red { color: #D32F2F; }

        .card-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #757575;

          ion-icon {
            font-size: 16px;
          }

          .indicator-chip {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;

            &.neutral { background: #F5F5F5; color: #616161; }
            &.positive { background: #E8F5E9; color: #2E7D32; }
            &.negative { background: #FFEBEE; color: #D32F2F; }
          }
        }
      }
    }

    /* 3. Report Body */
    .report-body {
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      padding: 8px 0;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1976D2;
      padding: 24px 24px 8px 24px;
      display: flex;
      align-items: center;
      gap: 8px;

      ion-icon {
        font-size: 16px;
      }
    }

    .report-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 24px;
      font-size: 15px;

      .label-col {
        display: flex;
        align-items: center;
        color: #424242;
      }

      .indentation {
        display: inline-block;
        width: 16px;
        height: 1px;
        background: #E0E0E0;
        margin-right: 8px;
      }

      .value-col {
        font-weight: 500;
        text-align: right;
      }

      /* Negative Values */
      .negative-value {
        color: #D32F2F;
        font-weight: 500;
      }

      .positive-value {
        color: #2E7D32;
      }

      /* Row Levels */
      &.level-1 {
        padding-left: 32px;
        color: #616161;
        font-size: 14px;
        .indentation { width: 12px; }
      }

      &.level-2 {
        padding-left: 48px;
        color: #757575;
        font-size: 13px;
        .indentation { background: #EEEEEE; }
      }

      /* Highlighted Rows (Totals) */
      &.total-row {
        background: #F5F5F5;
        margin: 4px 12px;
        padding: 12px;
        border-radius: 8px;
        font-weight: 600;
        
        .label-col { color: #212121; }
      }

      /* Profit and EBITDA specific highlights */
      &.profit-row {
        margin-bottom: 16px;
        border-top: 1px dashed #E0E0E0;
        border-radius: 0;
        background: transparent;
      }

      &.ebitda-row {
        background: #E3F2FD;
        margin: 8px 12px 16px 12px;
        padding: 14px 12px;
        border-radius: 8px;
        
        .label-col { color: #1565C0; font-weight: 700; }
        .value-col { color: #1565C0; font-weight: 700; font-size: 16px; }
      }

      &.net-profit-row {
        background: #E8F5E9;
        margin: 16px 12px 8px 12px;
        padding: 16px 12px;
        border-radius: 8px;
        border: 1px solid #C8E6C9;
        
        .label-col { color: #2E7D32; font-weight: 700; font-size: 16px; }
        .value-col { color: #2E7D32; font-weight: 800; font-size: 18px; }
      }
    }

    @media print {
      .no-print { display: none !important; }
      .report-container { padding: 0; background: white; }
      .report-body { box-shadow: none; }
      .executive-summary .summary-card { border: 1px solid #E0E0E0; box-shadow: none; break-inside: avoid; }
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ReportViewerComponent implements OnInit, OnChanges {
  @Input() data: ReportData | null = null;
  @Input() title: string = '';
  @Input() period: string = '';

  isDRE = false;
  metrics = {
    recurrence: 0,
    grossMargin: 0,
    ebitdaMargin: 0,
    netProfit: 0,
    netMargin: 0
  };
  
  processedRows: any[] = [];

  constructor() {
    addIcons({ printOutline, downloadOutline, closeOutline, trendingUpOutline, trendingDownOutline });
  }

  ngOnInit() {
    this.processData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.processData();
    }
  }

  abs(value: number) {
    return Math.abs(value);
  }

  closeReport() {
    const modal = document.querySelector('ion-modal');
    if (modal) modal.dismiss();
  }

  processData() {
    if (!this.data) return;

    // Check if it's a DRE report to format it specifically
    this.isDRE = this.title.toLowerCase().includes('dre') || this.title.toLowerCase().includes('resultado');

    if (this.isDRE && this.data.summary) {
      const { receitaLiquida = 1, ebitda = 0, lucroLiquido = 0, lucroBruto = 0 } = this.data.summary;
      
      let recVal = 0;
      const recRow = this.data.details.find(d => d.label.toLowerCase().includes('recorrente') && !d.label.toLowerCase().includes('não'));
      if (recRow) recVal = recRow.value;

      const receitaToDivide = receitaLiquida || 1; // Prevent division by zero
      
      this.metrics = {
        recurrence: (recVal / receitaToDivide) * 100,
        grossMargin: (lucroBruto / receitaToDivide) * 100,
        ebitdaMargin: (ebitda / receitaToDivide) * 100,
        netProfit: lucroLiquido,
        netMargin: (lucroLiquido / receitaToDivide) * 100
      };
    }

    this.processedRows = [];
    let currentSection = '';

    // Advanced Formatting & Grouping
    for (const row of this.data.details) {
      const normalizedLabel = row.label.toLowerCase();
      let isSectionHeader = false;
      let sectionName = '';

      // Section logic based on DRE common blocks
      if (this.isDRE && (row.level === 0 || row.level === 1)) {
        if (normalizedLabel.includes('receita bruta') && currentSection !== 'RECEITA') {
          isSectionHeader = true; sectionName = 'RECEITA'; currentSection = 'RECEITA';
        } else if (normalizedLabel.includes('custos') && currentSection !== 'CUSTOS') {
          isSectionHeader = true; sectionName = 'CUSTOS'; currentSection = 'CUSTOS';
        } else if (normalizedLabel.includes('despesas operacionais') && currentSection !== 'DESPESAS OPERACIONAIS') {
          isSectionHeader = true; sectionName = 'DESPESAS OPERACIONAIS'; currentSection = 'DESPESAS OPERACIONAIS';
        } else if (normalizedLabel.includes('ebitda') && currentSection !== 'RESULTADO OPERACIONAL') {
          isSectionHeader = true; sectionName = 'RESULTADO OPERACIONAL'; currentSection = 'RESULTADO OPERACIONAL';
        } else if (normalizedLabel.includes('resultado financeiro') && currentSection !== 'RESULTADO FINAL') {
          isSectionHeader = true; sectionName = 'RESULTADO FINAL'; currentSection = 'RESULTADO FINAL';
        }
      }

      this.processedRows.push({
        ...row,
        isSectionHeader,
        sectionName,
        isProfit: normalizedLabel.includes('lucro bruto') || normalizedLabel.includes('receita líquida'),
        isEbitda: normalizedLabel.includes('ebitda'),
        isNetProfit: normalizedLabel.includes('lucro líquido') || normalizedLabel.includes('resultado do exercício')
      });
    }
  }

  downloadCSV() {
    if (!this.data || !this.data.details) return;

    const headers = ['Descrição', 'Valor'];
    const rows = this.data.details.map(row => {
      const indent = '  '.repeat(row.level || 0);
      return ['"' + indent + row.label + '"', row.value.toFixed(2)];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = this.title.replace(/\\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.csv';
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
