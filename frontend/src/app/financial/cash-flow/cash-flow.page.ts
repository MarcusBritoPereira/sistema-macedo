import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList,
  IonProgressBar, IonSelect, IonSelectOption, IonItemGroup, IonItemDivider, IonIcon, IonButton,
  IonDatetimeButton, IonModal, IonDatetime, IonSpinner, ModalController, IonFab, IonFabButton, IonFabList,
  IonNote, IonBadge, IonSearchbar, IonText
} from '@ionic/angular/standalone';
import { FinancialDashboardService, OperationalDashboardResponse } from '../../services/financial/financial-dashboard.service';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';
import { addIcons } from 'ionicons';
import {
  filter, trendingUpOutline, trendingDownOutline, walletOutline, arrowUpCircleOutline,
  arrowDownCircleOutline, receiptOutline, timeOutline, statsChartOutline, syncOutline,
  alertCircleOutline, add, arrowUp, arrowDown, chevronBack, chevronForward, calendarOutline,
  ellipsisVertical, pencilOutline, trashOutline, checkmarkCircleOutline, searchOutline,
  chevronDownOutline, chevronUpOutline
} from 'ionicons/icons';
import { Chart, ChartConfiguration, ChartData, ChartEvent, ChartType, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(...registerables);

@Component({
  selector: 'app-cash-flow',
  templateUrl: './cash-flow.page.html',
  styleUrls: ['./cash-flow.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, BaseChartDirective,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList,
    IonProgressBar, IonSelect, IonSelectOption, IonItemGroup, IonItemDivider, IonIcon, IonButton,
    IonDatetimeButton, IonModal, IonDatetime, IonSpinner, IonFab, IonFabButton, IonFabList,
    IonNote, IonBadge, IonSearchbar, IonText
  ]
})
export class CashFlowPage implements OnInit {
  operationalData: any | null = null; // Use specific type if updated
  loading = false;

  // Date State
  currDate = new Date();

  // Chart State
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {},
      y: {
        beginAtZero: true,
        grid: { color: '#e5e7eb' }
      },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false } // Independent axis for balance? Or shared?
        // User requested: "Linha azul = saldo acumulado". Usually balance is much larger or can be negative.
        // Best to use same axis if numbers are comparable, or separate if different scales.
        // Let's use same axis for now as balance is usually in same magnitude as accumulated flows over time? 
        // Actually, balance is stock, flow is flow. But users often want to see them together.
      }
    },
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    }
  };

  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar' | 'line'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Entradas', backgroundColor: '#16A34A', borderRadius: 4, order: 2 },
      { data: [], label: 'Saídas', backgroundColor: '#DC2626', borderRadius: 4, order: 3 }
    ]
  };

  // Transaction Filters
  filterPeriod: 'today' | 'week' | 'month' = 'month';
  readonly pageSize = 50;
  currentPage = 1;
  showAccounts = false; // Collapsible

  constructor(
    private dashboardService: FinancialDashboardService,
    private modalCtrl: ModalController
  ) {
    addIcons({
      filter, trendingUpOutline, trendingDownOutline, walletOutline, arrowUpCircleOutline,
      arrowDownCircleOutline, receiptOutline, timeOutline, statsChartOutline, syncOutline,
      alertCircleOutline, add, arrowUp, arrowDown, chevronBack, chevronForward, calendarOutline,
      ellipsisVertical, pencilOutline, trashOutline, checkmarkCircleOutline, searchOutline,
      chevronDownOutline, chevronUpOutline
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    const m = this.currDate.getMonth() + 1;
    const y = this.currDate.getFullYear();

    // Using getCashFlowDashboard instead of getOperationalDashboard
    this.dashboardService.getCashFlowDashboard(m, y).subscribe({
      next: (data) => {
        this.operationalData = data;
        this.currentPage = 1;
        this.updateChart(data.chart);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard', err);
        this.loading = false;
      }
    });
  }

  updateChart(dailyFlow: any[]) {
    if (!dailyFlow) return;

    this.barChartData.labels = dailyFlow.map(d => d.label); // Day numbers

    this.barChartData.datasets[0].data = dailyFlow.map(d => d.entradas);
    this.barChartData.datasets[1].data = dailyFlow.map(d => d.saidas);

    this.chart?.update();
  }

  changeMonth(delta: number) {
    this.currDate = new Date(this.currDate.getFullYear(), this.currDate.getMonth() + delta, 1);
    this.loadData();
  }

  get currentPeriodLabel(): string {
    return this.currDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  toggleAccounts() {
    this.showAccounts = !this.showAccounts;
  }

  selectFilter(period: 'today' | 'week' | 'month') {
    this.filterPeriod = period;
    this.currentPage = 1;
  }

  get filteredTransactions() {
    if (!this.operationalData?.transactions) return [];

    const transactions = this.operationalData.transactions;
    if (this.filterPeriod === 'month') return transactions;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (this.filterPeriod === 'today') {
      return transactions.filter((t: any) => {
        const date = new Date(t.data);
        return date >= startOfToday && date <= endOfToday;
      });
    }

    const dayOfWeek = startOfToday.getDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return transactions.filter((t: any) => {
      const date = new Date(t.data);
      return date >= startOfWeek && date <= endOfWeek;
    });
  }

  get paginatedTransactions() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredTransactions.length / this.pageSize));
  }

  get paginationStart() {
    if (this.filteredTransactions.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd() {
    return Math.min(this.currentPage * this.pageSize, this.filteredTransactions.length);
  }

  changePage(delta: number) {
    const nextPage = this.currentPage + delta;
    if (nextPage < 1 || nextPage > this.totalPages) return;
    this.currentPage = nextPage;
  }

  // Actions
  async openTransactionModal(type: 'RECEITA' | 'DESPESA' = 'RECEITA') {
    const modal = await this.modalCtrl.create({
      component: TransactionModalComponent,
      componentProps: { type }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadData();
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
  }
}
