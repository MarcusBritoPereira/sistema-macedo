import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
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
  businessOutline,
  receiptOutline,
  trendingUpOutline,
  clipboardOutline,
  arrowForwardOutline,
  documentTextOutline,
  barChartOutline,
  notificationsOutline,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { FinancialDashboardService, FinancialDashboardData } from '../../services/financial/financial-dashboard.service';
import { AuthService } from '../../services/auth/auth.service';

Chart.register(...registerables);

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BaseChartDirective,
    CurrencyPipe,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss']
})
export class DashboardPage implements OnInit {

  data!: FinancialDashboardData;
  loading = true;
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();

  months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  shortMonths = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  cards: any[] = [];

  payableForecastChart!: ChartConfiguration<'bar'>['data'];
  supplierExpensesChart!: ChartConfiguration<'bar'>['data'];
  costTypeExpensesChart!: ChartConfiguration<'bar'>['data'];

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#0f172a',
          font: {
            size: 12,
            weight: 500
          }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#e2e8f0',
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
            if (context.raw !== undefined && context.raw !== null) {
              label += new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(Number(context.raw));
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#1e293b' },
        grid: { display: false }
      },
      y: {
        ticks: {
          color: '#1e293b',
          callback: (value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`
        }
      }
    }
  };

  horizontalChartOptions: ChartConfiguration<'bar'>['options'] = {
    ...this.chartOptions,
    indexAxis: 'y',
    scales: {
      x: {
        ticks: {
          color: '#1e293b',
          callback: (value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`
        }
      },
      y: {
        ticks: { color: '#1e293b' },
        grid: { display: false }
      }
    }
  };

  constructor(
    private dashboardService: FinancialDashboardService,
    public auth: AuthService
  ) {
    addIcons({
      menuOutline,
      calendarOutline,
      chevronDownOutline,
      personCircleOutline,
      walletOutline,
      arrowDownOutline,
      arrowUpOutline,
      analyticsOutline,
      businessOutline,
      receiptOutline,
      trendingUpOutline,
      clipboardOutline,
      arrowForwardOutline,
      documentTextOutline,
      barChartOutline,
      notificationsOutline,
      chevronBackOutline,
      chevronForwardOutline
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboard(this.currentYear, this.currentMonth).subscribe({
      next: (response: FinancialDashboardData) => {
        this.data = response;

        this.cards = [
          {
            title: 'Saldo Atual',
            value: response.cards.currentBalance,
            icon: 'wallet-outline',
            primary: true
          },
          {
            title: 'Entradas no Mês',
            value: response.cards.monthlyIncome,
            icon: 'arrow-down-outline',
            primary: true
          },
          {
            title: 'Saídas no Mês',
            value: response.cards.monthlyExpense,
            icon: 'arrow-up-outline',
            primary: false
          },
          {
            title: 'Resultado do Mês',
            value: response.cards.monthlyResult,
            icon: 'analytics-outline',
            primary: true
          },
          {
            title: 'A Receber',
            value: response.cards.receivable,
            icon: 'business-outline',
            primary: true
          },
          {
            title: 'A Pagar',
            value: response.cards.payable,
            icon: 'receipt-outline',
            primary: false
          },
          {
            title: 'Saldo Projetado',
            value: response.cards.projectedBalance,
            icon: 'trending-up-outline',
            primary: true
          }
        ];

        this.payableForecastChart = {
          labels: this.months,
          datasets: [
            {
              label: 'Contas a Pagar Previstas',
              data: response.payableForecast,
              backgroundColor: '#0057ff',
              borderRadius: 6
            }
          ]
        };

        this.supplierExpensesChart = {
          labels: response.supplierExpenses.map((item: any) => item.name),
          datasets: [
            {
              label: 'Valor Gasto',
              data: response.supplierExpenses.map((item: any) => item.value),
              backgroundColor: '#0057ff',
              borderRadius: 6
            }
          ]
        };

        this.costTypeExpensesChart = {
          labels: response.costTypeExpenses.map((item: any) => item.name),
          datasets: [
            {
              label: 'Valor Gasto',
              data: response.costTypeExpenses.map((item: any) => item.value),
              backgroundColor: '#0057ff',
              borderRadius: 6
            }
          ]
        };
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading dashboard data', err);
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

  changePeriod(delta: number): void {
    let newMonth = this.currentMonth + delta;
    if (newMonth > 11) {
      newMonth = 0;
      this.currentYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      this.currentYear--;
    }
    this.currentMonth = newMonth;
    this.loadDashboard();
  }
}
