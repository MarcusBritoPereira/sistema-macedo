import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

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
      <div class="report-header">
        <h2>{{ title }}</h2>
        <p *ngIf="period">{{ period }}</p>
      </div>

      <div class="table-responsive">
        <div class="report-row" *ngFor="let row of data.details" 
             [class.level-0]="row.level === 0"
             [class.level-1]="row.level === 1"
             [class.level-2]="row.level === 2"
             [class.highlight]="row.highlight">
          
          <div class="label-col">
            {{ row.label }}
          </div>
          <div class="value-col" [class.negative]="row.value < 0">
            {{ row.value | currency:'BRL' }}
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .report-container {
      background: var(--ion-background-color);
      border-radius: 8px;
      padding: 16px;
    }
    
    .report-header {
      margin-bottom: 24px;
      text-align: center;
      
      h2 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--ion-color-dark);
      }
      p {
        margin: 4px 0 0;
        color: var(--ion-color-medium);
        font-size: 0.9rem;
      }
    }

    .report-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--ion-color-light);
      align-items: center;

      &:last-child {
        border-bottom: none;
      }

      .value-col {
        font-family: 'Roboto Mono', monospace;
        font-weight: 500;
      }

      .negative {
        color: var(--ion-color-danger);
      }
    }

    /* Level Styles */
    .level-0 {
      background: var(--ion-color-light);
      padding: 16px 8px;
      font-weight: 800;
      font-size: 1.1rem;
      margin-top: 8px;
      border-radius: 4px;
      border-bottom: none;
    }

    .level-1 {
      font-weight: 600;
      font-size: 1rem;
      padding-left: 8px;
      margin-top: 4px;
    }

    .level-2 {
      font-weight: 400;
      font-size: 0.95rem;
      padding-left: 24px;
      color: var(--ion-color-medium-shade);
    }

    .highlight {
      background: var(--ion-color-primary-tint);
      color: var(--ion-color-primary-contrast);
      
      .value-col {
        color: inherit;
      }
    }
  `],
    standalone: true,
    imports: [CommonModule, IonicModule]
})
export class ReportViewerComponent implements OnInit {
    @Input() data: ReportData | null = null;
    @Input() title: string = '';
    @Input() period: string = '';

    constructor() { }

    ngOnInit() { }
}
