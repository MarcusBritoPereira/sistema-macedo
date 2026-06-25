import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  calendarOutline,
  chevronDownOutline,
  personCircleOutline,
  walletOutline,
  arrowDownOutline,
  arrowUpOutline,
  analyticsOutline,
  peopleOutline,
  flameOutline,
  trendingUpOutline,
  clipboardOutline,
  personOutline,
  bagHandleOutline,
  notificationsOutline
} from 'ionicons/icons';
import { CashFlowData, CashFlowService } from '../../services/financial/cash-flow.service';

Chart.register(...registerables);

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [CommonModule, IonicModule, BaseChartDirective],
  templateUrl: './cash-flow.page.html',
  styleUrls: ['./cash-flow.page.scss']
})
export class CashFlowPage implements OnInit {

  data!: CashFlowData;
  loading = true;
  currentYear = new Date().getFullYear();

  cards: any[] = [];

  monthlyReceivedChart!: any;
  clientChart!: any;
  receivedSpentChart!: any;
  expensesByWorkChart!: any;

  // Elegant styling for Tooltips and Scales
  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#1e293b',
          font: {
            size: 12,
            weight: 600,
            family: 'Outfit, Inter, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { weight: 500 } },
        grid: { display: false }
      },
      y: {
        ticks: {
          color: '#64748b',
          callback: (value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`
        },
        grid: {
          color: '#f1f5f9'
        }
      }
    }
  };

  horizontalOptions: ChartConfiguration<'bar'>['options'] = {
    ...this.chartOptions,
    indexAxis: 'y',
    scales: {
      x: {
        ticks: {
          color: '#64748b',
          callback: (value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`
        },
        grid: { color: '#f1f5f9' }
      },
      y: {
        ticks: { color: '#64748b', font: { weight: 500 } },
        grid: { display: false }
      }
    }
  };

  constructor(private cashFlowService: CashFlowService) {
    addIcons({
      menuOutline,
      calendarOutline,
      chevronDownOutline,
      personCircleOutline,
      walletOutline,
      arrowDownOutline,
      arrowUpOutline,
      analyticsOutline,
      peopleOutline,
      flameOutline,
      trendingUpOutline,
      clipboardOutline,
      personOutline,
      bagHandleOutline,
      notificationsOutline
    });
  }

  ngOnInit(): void {
    this.loadCashFlow();
  }

  loadCashFlow(): void {
    this.loading = true;
    this.cashFlowService.getCashFlow().subscribe({
      next: (response: CashFlowData) => {
        this.data = response;

        // Custom structure with color mappings and semantical settings
        this.cards = [
          { title: 'Saldo Inicial', value: response.cards.initialBalance, icon: 'wallet-outline', type: 'info' },
          { title: 'Total Recebido', value: response.cards.totalReceived, icon: 'arrow-down-outline', type: 'success' },
          { title: 'Total Gasto', value: response.cards.totalSpent, icon: 'arrow-up-outline', type: 'danger' },
          { title: 'Saldo Final', value: response.cards.finalBalance, icon: 'analytics-outline', type: 'primary' },
          { title: 'A Receber de Clientes', value: response.cards.receivableClients, icon: 'people-outline', type: 'pending' },
          { title: 'Queima de Caixa', value: response.cards.cashBurn, icon: 'flame-outline', type: 'danger', suffix: ' / sem' }
        ];

        // Green emerald style for cash-in flow
        this.monthlyReceivedChart = {
          labels: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
          datasets: [
            {
              type: 'bar',
              label: 'Recebido',
              data: response.monthlyReceived,
              backgroundColor: '#10b981', // Emerald green
              hoverBackgroundColor: '#059669',
              borderRadius: 8
            },
            {
              type: 'line',
              label: 'Tendência',
              data: response.monthlyReceived,
              borderColor: '#0f172a', // Charcoal trendline
              backgroundColor: 'transparent',
              borderWidth: 3,
              pointBackgroundColor: '#0f172a',
              pointHoverRadius: 6,
              tension: 0.35
            }
          ]
        };

        // Emerald received vs Slate receivable
        this.clientChart = {
          labels: response.clientReceivedVsReceivable.map((item: any) => item.client),
          datasets: [
            {
              label: 'Recebido',
              data: response.clientReceivedVsReceivable.map((item: any) => item.received),
              backgroundColor: '#10b981',
              hoverBackgroundColor: '#059669',
              borderRadius: 6
            },
            {
              label: 'A Receber',
              data: response.clientReceivedVsReceivable.map((item: any) => item.receivable),
              backgroundColor: '#94a3b8',
              hoverBackgroundColor: '#64748b',
              borderRadius: 6
            }
          ]
        };

        // Received vs Spent with Balance trendline
        this.receivedSpentChart = {
          labels: response.receivedVsSpent.map((item: any) => item.month),
          datasets: [
            {
              type: 'bar',
              label: 'Recebido',
              data: response.receivedVsSpent.map((item: any) => item.received),
              backgroundColor: '#10b981',
              hoverBackgroundColor: '#059669',
              borderRadius: 6
            },
            {
              type: 'bar',
              label: 'Gasto',
              data: response.receivedVsSpent.map((item: any) => item.spent),
              backgroundColor: '#ef4444', // Red for spent (formerly orange)
              hoverBackgroundColor: '#dc2626',
              borderRadius: 6
            },
            {
              type: 'line',
              label: 'Saldo',
              data: response.receivedVsSpent.map((item: any) => item.balance),
              borderColor: '#0f172a',
              backgroundColor: 'transparent',
              borderWidth: 3,
              pointBackgroundColor: '#0f172a',
              tension: 0.35
            }
          ]
        };

        // Expenses by work horizontal chart
        this.expensesByWorkChart = {
          labels: response.expensesByWork.map((item: any) => item.work),
          datasets: [
            {
              label: 'Despesa',
              data: response.expensesByWork.map((item: any) => item.value),
              backgroundColor: '#ef4444', // Red for spent (formerly orange)
              hoverBackgroundColor: '#dc2626',
              borderRadius: 6
            }
          ]
        };

        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading cash flow data', err);
        this.loading = false;
      }
    });
  }

  formatMoney(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
}
