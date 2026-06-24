import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import {
  FinancialDashboardService,
  OperationalDashboardResponse,
} from '../../services/financial/financial-dashboard.service';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowForwardOutline,
  business,
  calendarOutline,
  cashOutline,
  constructOutline,
  ellipsisHorizontal,
  pieChartOutline,
  pricetagOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  speedometerOutline,
  statsChartOutline,
  trendingDownOutline,
  trendingUpOutline,
  walletOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    BaseChartDirective,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonButton,
    IonSpinner,
  ],
})
export class DashboardPage implements OnInit, OnDestroy {
  operationalData: OperationalDashboardResponse | null = null;
  loading = false;
  errorMessage = '';
  activeRange = 'Mês atual';
  loadingSlow = false;
  loadingTimeout = false;

  private loadingSubscription: Subscription | null = null;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // Chart 1: Daily Flow (Mixed)
  public dailyFlowChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
  };
  public dailyFlowChartData: ChartData<'bar' | 'line'> = {
    labels: [],
    datasets: [],
  };


  // Chart 3: Cost Center Expenses (Doughnut)
  public costCenterChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#F8FAFC',
        bodyColor: '#F8FAFC',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = (context.raw as number) || 0;
            return ` ${label}: ${this.formatCurrency(value)}`;
          },
        },
      },
    },
  };
  public costCenterChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [],
  };

  constructor(private dashboardService: FinancialDashboardService) {
    addIcons({
      business,
      ellipsisHorizontal,
      alertCircleOutline,
      informationCircleOutline,
      speedometerOutline,
      pieChartOutline,
      pricetagOutline,
      constructOutline,
      trendingUpOutline,
      trendingDownOutline,
      cashOutline,
      statsChartOutline,
      refreshOutline,
      calendarOutline,
      shieldCheckmarkOutline,
      arrowForwardOutline,
      walletOutline,
    });
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.clearTimers();
    this.loadingSubscription?.unsubscribe();
  }

  private clearTimers() {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  loadData() {
    this.loadingSubscription?.unsubscribe();
    this.clearTimers();

    this.loading = true;
    this.loadingSlow = false;
    this.loadingTimeout = false;
    this.errorMessage = '';

    // After 10s, show "loading slowly" message
    this.slowTimer = setTimeout(() => {
      if (this.loading) {
        this.loadingSlow = true;
      }
    }, 10000);

    // After 30s, show timeout/retry option
    this.timeoutTimer = setTimeout(() => {
      if (this.loading) {
        this.loadingTimeout = true;
      }
    }, 30000);

    this.loadingSubscription = this.dashboardService.getOperationalDashboard().subscribe({
      next: (data) => {
        this.clearTimers();
        this.operationalData = data;
        this.setupCharts(data);
        this.loading = false;
        this.loadingSlow = false;
        this.loadingTimeout = false;
      },
      error: (err) => {
        this.clearTimers();
        console.error('Error loading dashboard', err);

        if (err.status === 0) {
          this.errorMessage =
            'Sem conexão com o servidor. Verifique sua rede e tente novamente.';
        } else if (err.status === 504 || err.status === 408) {
          this.errorMessage =
            'O servidor demorou demais para responder. Tente novamente em alguns instantes.';
        } else {
          this.errorMessage =
            'Não foi possível carregar o dashboard agora. Verifique a conexão e tente novamente.';
        }

        this.loading = false;
        this.loadingSlow = false;
        this.loadingTimeout = false;
      },
    });
  }

  setupCharts(data: OperationalDashboardResponse) {
    // 1. Daily Flow Chart
    if (data.dailyFlow) {
      const labels = data.dailyFlow.map((d) => d.label);
      const recebs = data.dailyFlow.map((d) => d.recebimentos);
      const pags = data.dailyFlow.map((d) => d.pagamentos);
      const saldo = data.dailyFlow.map((d) => d.saldo);

      this.dailyFlowChartData = {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: 'Saldo',
            data: saldo,
            borderColor: '#1E3A8A', // Blue Royal
            backgroundColor: '#1E3A8A',
            pointBackgroundColor: '#fff',
            pointBorderColor: '#1E3A8A',
            borderWidth: 2,
            tension: 0.4,
            order: 1,
          },
          {
            type: 'bar',
            label: 'Recebimentos',
            data: recebs,
            backgroundColor: '#60A5FA', // Blue Light
            borderRadius: 4,
            barPercentage: 0.6,
            order: 2,
          },
          {
            type: 'bar',
            label: 'Pagamentos',
            data: pags,
            backgroundColor: '#2563EB', // Blue Dark (Using darker blue for Payments as per image palette hint, usually red but image shows blue/purple shades or maybe my analysis is off. The image legend says "Recebimentos, Pagamentos, Saldo". The bars are Light Blue and Dark Blue. Let's stick to Blues as requested by image style.)
            // Wait, standard finance is Green/Red. But the image is VERY blue/cyan.
            // Let's use the colors from SCSS.
            borderRadius: 4,
            barPercentage: 0.6,
            order: 3,
          },
        ],
      };
    }


    // 3. Cost Center Expenses Chart
    if (data.costCenterKpis?.expensesByCostCenter) {
      const expenses = data.costCenterKpis.expensesByCostCenter;
      const ccLabels = expenses.map((e) => e.nome);
      const ccValues = expenses.map((e) => e.total);
      const ccColors = expenses.map((e) => e.cor || '#64748B');

      this.costCenterChartData = {
        labels: ccLabels,
        datasets: [
          {
            data: ccValues,
            backgroundColor: ccColors,
            hoverBackgroundColor: ccColors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          },
        ],
      };
    }
  }

  get totalReceivablesRisk(): number {
    if (!this.operationalData) return 0;
    return (
      this.operationalData.receivables.overdue +
      this.operationalData.receivables.today +
      this.operationalData.receivables.remainingMonth
    );
  }

  get totalPayablesRisk(): number {
    if (!this.operationalData) return 0;
    return (
      this.operationalData.payables.overdue +
      this.operationalData.payables.today +
      this.operationalData.payables.remainingMonth
    );
  }

  get projectedNetFlow(): number {
    return this.totalReceivablesRisk - this.totalPayablesRisk;
  }

  get overdueBalance(): number {
    if (!this.operationalData) return 0;
    return (
      this.operationalData.receivables.overdue -
      this.operationalData.payables.overdue
    );
  }

  get healthScore(): number {
    if (!this.operationalData) return 0;
    const obligations = Math.max(this.totalPayablesRisk, 1);
    const liquidity = Math.min(
      (this.operationalData.totalBalance / obligations) * 55,
      55,
    );
    const overduePenalty = this.operationalData.payables.overdue > 0 ? 20 : 0;
    const deviationPenalty = Math.min(
      (this.operationalData.costCenterKpis?.deviations?.length || 0) * 10,
      25,
    );
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(45 + liquidity - overduePenalty - deviationPenalty),
      ),
    );
  }

  get healthLabel(): string {
    if (this.healthScore >= 80) return 'Saudável';
    if (this.healthScore >= 60) return 'Atenção';
    return 'Crítico';
  }

  get healthTone(): 'success' | 'warning' | 'danger' {
    if (this.healthScore >= 80) return 'success';
    if (this.healthScore >= 60) return 'warning';
    return 'danger';
  }

  get lastUpdateLabel(): string {
    if (!this.operationalData?.lastUpdate) return 'Aguardando atualização';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(this.operationalData.lastUpdate));
  }

  get topAccountLabel(): string {
    const account = this.operationalData?.accounts?.[0];
    if (!account) return 'Nenhuma conta cadastrada';
    return `${account.banco} · ${account.nome}`;
  }

  get hasDailyFlowData(): boolean {
    return (this.operationalData?.dailyFlow?.length || 0) > 0;
  }


  formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  }
}
