import { Component, OnInit } from '@angular/core';
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
  chevronDownOutline,
  personCircleOutline,
  clipboardOutline,
  documentTextOutline,
  analyticsOutline,
  receiptOutline,
  barChartOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

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
export class DashboardPage implements OnInit {
  operationalData: OperationalDashboardResponse | null = null;
  loading = false;
  errorMessage = '';
  activeRange = 'Mês atual';

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


  public verticalBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 11, weight: 'bold' } } },
      y: {
        beginAtZero: true,
        grid: { color: '#e5e7eb' },
        ticks: { color: '#0f172a', callback: (value) => this.compactCurrency(Number(value)) },
      },
    },
    plugins: {
      legend: { display: true, labels: { boxWidth: 10, color: '#0f172a', font: { size: 11 } } },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${this.formatCurrency(Number(context.raw || 0))}` } },
    },
  };

  public horizontalBarOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { beginAtZero: true, grid: { color: '#e5e7eb' }, ticks: { callback: (value) => this.compactCurrency(Number(value)) } },
      y: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 12, weight: 'bold' } } },
    },
    plugins: {
      legend: { display: true, labels: { boxWidth: 10, color: '#0f172a', font: { size: 11 } } },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${this.formatCurrency(Number(context.raw || 0))}` } },
    },
  };

  public monthlyPayablesChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  public supplierChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  public costTypeChartData: ChartData<'bar'> = { labels: [], datasets: [] };

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
      chevronDownOutline,
      personCircleOutline,
      clipboardOutline,
      documentTextOutline,
      analyticsOutline,
      receiptOutline,
      barChartOutline,
      notificationsOutline,
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.errorMessage = '';
    this.dashboardService.getOperationalDashboard().subscribe({
      next: (data) => {
        this.operationalData = data;
        this.setupCharts(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard', err);
        this.errorMessage =
          'Não foi possível carregar o dashboard agora. Verifique a conexão e tente novamente.';
        this.loading = false;
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


    this.monthlyPayablesChartData = this.buildBarData(
      data.monthlyPayables?.map((item) => item.label) || [],
      data.monthlyPayables?.map((item) => item.valor) || [],
      'Contas a Pagar Previstas',
    );

    this.supplierChartData = this.buildBarData(
      data.expensesBySupplier?.map((item) => item.nome) || [],
      data.expensesBySupplier?.map((item) => item.total) || [],
      'Valor Gasto',
    );

    this.costTypeChartData = this.buildBarData(
      data.expensesByCostType?.map((item) => item.nome) || [],
      data.expensesByCostType?.map((item) => item.total) || [],
      'Valor Gasto',
    );

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


  get periodLabel(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${this.formatDate(start.toISOString())} - ${this.formatDate(end.toISOString())}`;
  }

  get monthlyInflows(): number {
    return this.operationalData?.monthlyTotals?.inflows || 0;
  }

  get monthlyOutflows(): number {
    return this.operationalData?.monthlyTotals?.outflows || 0;
  }

  get monthlyResult(): number {
    return this.monthlyInflows - this.monthlyOutflows;
  }

  get pendingReceivables(): number {
    return this.totalReceivablesRisk;
  }

  get pendingPayables(): number {
    return this.totalPayablesRisk;
  }

  get projectedBalance(): number {
    return (this.operationalData?.totalBalance || 0) + this.pendingReceivables - this.pendingPayables;
  }

  get alerts(): { dueNext7: number } {
    return { dueNext7: this.operationalData?.alerts?.dueNext7 || 0 };
  }

  get summaryCards() {
    return [
      { label: 'Saldo Atual', value: this.operationalData?.totalBalance || 0, icon: 'wallet-outline' },
      { label: 'Entradas no Mês', value: this.monthlyInflows, icon: 'trending-down-outline' },
      { label: 'Saídas no Mês', value: this.monthlyOutflows, icon: 'trending-up-outline', muted: true },
      { label: 'Resultado do Mês', value: this.monthlyResult, icon: 'stats-chart-outline' },
      { label: 'A Receber', value: this.pendingReceivables, icon: 'business' },
      { label: 'A Pagar', value: this.pendingPayables, icon: 'document-text-outline', muted: true },
      { label: 'Saldo Projetado', value: this.projectedBalance, icon: 'speedometer-outline' },
    ];
  }

  get mainDeviationText(): string {
    const deviation = this.operationalData?.costCenterKpis?.deviations?.[0];
    if (!deviation || deviation.previsto <= 0) return 'Nenhuma obra acima do orçamento previsto';
    const pct = ((deviation.realizado - deviation.previsto) / deviation.previsto) * 100;
    return `${deviation.nome} está ${pct.toFixed(0)}% acima do orçamento previsto`;
  }

  buildBarData(labels: string[], values: number[], label: string): ChartData<'bar'> {
    return {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: '#0b5be7',
        borderColor: '#0b45bf',
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.58,
        categoryPercentage: 0.72,
      }],
    };
  }

  compactCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(value));
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  }
}
