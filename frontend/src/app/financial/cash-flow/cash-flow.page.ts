import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonItem, IonSelect, IonSelectOption, IonSpinner, IonGrid, IonRow, IonCol,
  IonIcon, IonBadge, IonButton, IonSegment, IonSegmentButton, IonLabel,
  IonModal, ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { CashFlowService, CashFlowSummary } from '../../services/financial/cash-flow.service';
import { FinancialService } from '../../services/financial/financial';
import { CategoriesService } from '../../services/financial/categories.service';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';
import { addIcons } from 'ionicons';
import {
  businessOutline, chevronBack, chevronForward, calendarOutline,
  refreshOutline, trendingUpOutline, trendingDownOutline, walletOutline,
  barChartOutline, informationCircleOutline, createOutline, trashOutline, addOutline
} from 'ionicons/icons';
import { parse, addMonths, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

type FilterType = 'today' | 'week' | 'month';

@Component({
  selector: 'app-cash-flow',
  templateUrl: './cash-flow.page.html',
  styleUrl: './cash-flow.page.scss',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonMenuButton, IonCard, IonCardContent, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonItem, IonSelect, IonSelectOption,
    IonSpinner, IonGrid, IonRow, IonCol, IonIcon, IonBadge, IonButton,
    IonSegment, IonSegmentButton, IonLabel
  ]
})
export class CashFlowPage implements OnInit {
  selectedMonthStr = format(new Date(), 'yyyy-MM');
  months: { value: string, label: string }[] = [];
  data: CashFlowSummary | null = null;
  dailyData: any[] = [];
  transactions: any[] = []; // Full list for current month
  filteredTransactions: any[] = []; // Filtered view
  maxVal = 1000;
  loading = false;
  categories: any[] = [];
  selectedCategoryId: string = '';

  currentFilter: FilterType = 'month';

  constructor(
    private cashFlowService: CashFlowService,
    private financialService: FinancialService,
    private categoriesService: CategoriesService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      businessOutline, chevronBack, chevronForward, calendarOutline,
      refreshOutline, trendingUpOutline, trendingDownOutline, walletOutline,
      barChartOutline, informationCircleOutline, createOutline, trashOutline, addOutline
    });
    this.generateMonths();
  }

  async openTransactionModal(transaction?: any) {
    const modal = await this.modalCtrl.create({
      component: TransactionModalComponent,
      componentProps: {
        transaction: transaction,
        type: transaction ? transaction.tipo : 'DESPESA'
      }
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'save' && data) {
      this.loading = true;
      if (transaction) {
        // Edit flow
        this.financialService.updateTransaction(transaction.id, data).subscribe({
          next: () => {
            this.loadData();
            this.showToast('Transação atualizada com sucesso!');
          },
          error: (err) => {
            console.error(err);
            this.loading = false;
            this.showToast('Erro ao atualizar transação.', 'danger');
          }
        });
      } else {
        // Create flow
        this.financialService.createTransaction(data).subscribe({
          next: () => {
            this.loadData();
            this.showToast('Transação criada com sucesso!');
          },
          error: (err) => {
            console.error(err);
            this.loading = false;
            this.showToast('Erro ao criar transação.', 'danger');
          }
        });
      }
    }
  }

  async deleteTransaction(transaction: any) {
    const alert = await this.alertCtrl.create({
      header: 'Excluir Transação',
      message: `Tem certeza que deseja excluir "${transaction.descricao}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.loading = true;
            this.financialService.deleteTransaction(transaction.id).subscribe({
              next: () => {
                this.loadData();
                this.showToast('Transação excluída.');
              },
              error: (err) => {
                console.error(err);
                this.loading = false;
                this.showToast('Erro ao excluir.', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  ngOnInit() {
    this.loadCategories();
    this.loadData();
  }

  loadCategories() {
    this.categoriesService.findAll().subscribe(cats => this.categories = cats);
  }

  onCategoryChange(event: any) {
    this.selectedCategoryId = event.detail.value;
    this.applyLocalFilter(); // Re-apply filters locally
  }

  generateMonths() {
    const monthsArr = [];
    const today = new Date();
    // Generate 6 months before and 6 months after today
    for (let i = -6; i <= 6; i++) {
      const d = addMonths(today, i);
      monthsArr.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy')
      });
    }
    this.months = monthsArr;
  }

  changeMonth(direction: number) {
    const currentDate = parse(this.selectedMonthStr, 'yyyy-MM', new Date());
    const nextDate = addMonths(currentDate, direction);
    this.selectedMonthStr = format(nextDate, 'yyyy-MM');
    this.currentFilter = 'month'; // Reset to month view when changing months
    this.loadData();
  }

  onMonthChange(event: any) {
    if (event.detail.value === this.selectedMonthStr) return;
    this.selectedMonthStr = event.detail.value;
    this.currentFilter = 'month';
    this.loadData();
  }

  setFilter(filter: FilterType) {
    this.currentFilter = filter;
    this.applyLocalFilter();
  }

  applyLocalFilter() {
    if (!this.data || !this.transactions) return;

    const now = new Date();
    // Adjust to local date string for comparison
    const todayStr = format(now, 'yyyy-MM-dd');

    // 0. Base Filter: Category
    let baseList = [...this.transactions];
    if (this.selectedCategoryId) {
      baseList = baseList.filter(t => t.categoriaId === this.selectedCategoryId);
    }

    if (this.currentFilter === 'today') {
      this.filteredTransactions = baseList.filter(t => t.dataVencimento.startsWith(todayStr));
    }
    else if (this.currentFilter === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
      const end = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

      this.filteredTransactions = baseList.filter(t => {
        const d = parseISO(t.dataVencimento);
        return isWithinInterval(d, { start, end });
      });
    }
    else {
      // Month (Default) - Show everything loaded (filtered by category if selected)
      this.filteredTransactions = baseList;
    }

    // Recalculate quick KPIs for the filtered view if needed, or keeping the month view KPIs?
    // User request implies they want to filter "what to pay/receive".
    // Let's rely on the list for specific details, but the main KPIs stay monthly as per "Fluxo de Caixa".
    // Alternatively, we could compute "Filtered Totals". let's compute them for display.
  }

  get filteredSummary() {
    // Correct "Pending vs Realized" logic
    // "A Receber" = Total Pending Receivables
    // "A Pagar" = Total Pending Payables
    // "Result" = Total In - Total Out (Projected Balance)

    // Status Logic: 'REALIZADO', 'CONCILIADO', 'PAGO', 'EFETIVADO' treated as Realized.
    const isRealized = (t: any) => {
      const s = (t.status || '').toUpperCase();
      return ['REALIZADO', 'CONCILIADO', 'PAGO', 'EFETIVADO'].includes(s);
    };

    const receivables = this.filteredTransactions
      .filter(t => t.tipo === 'RECEITA' && !isRealized(t))
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const payables = this.filteredTransactions
      .filter(t => t.tipo === 'DESPESA' && !isRealized(t))
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const totalIn = this.filteredTransactions.filter(t => t.tipo === 'RECEITA').reduce((acc, t) => acc + Number(t.valor), 0);
    const totalOut = this.filteredTransactions.filter(t => t.tipo === 'DESPESA').reduce((acc, t) => acc + Number(t.valor), 0);

    return {
      pendingReceivables: receivables,
      pendingPayables: payables,
      balance: totalIn - totalOut, // Result considers everything (Projected Cash Flow)
      totalIn,
      totalOut
    };
  }

  loadData() {
    this.loading = true;
    const [year, month] = this.selectedMonthStr.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    this.cashFlowService.getCashFlow(startDate, endDate).subscribe({
      next: (res) => {
        this.data = res;
        this.transactions = res.transactions || [];
        this.applyLocalFilter(); // Apply current filter (likely 'month')
        this.processDailyData(res.transactions, Number(year), Number(month), lastDay);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  processDailyData(transactions: any[], year: number, month: number, daysInMonth: number) {
    const days = [];
    let max = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const dayTrans = transactions.filter(t => t.dataVencimento && t.dataVencimento.startsWith(dateStr));

      const dayIn = dayTrans.filter(t => t.tipo === 'RECEITA').reduce((s, t) => s + Number(t.valor), 0);
      const dayOut = dayTrans.filter(t => t.tipo === 'DESPESA').reduce((s, t) => s + Number(t.valor), 0);

      if (dayIn > max) max = dayIn;
      if (dayOut > max) max = dayOut;

      days.push({
        date: new Date(year, month - 1, d),
        in: dayIn,
        out: dayOut
      });
    }

    this.dailyData = days;
    this.maxVal = max > 0 ? max : 1000;
  }
}
