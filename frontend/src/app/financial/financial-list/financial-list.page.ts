import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CategoriesService } from '../../services/financial/categories.service';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonCard, IonCardContent, IonBadge, IonIcon, IonButton, IonChip, ToastController, LoadingController, IonRefresher, IonRefresherContent, IonFab, IonFabButton, ActionSheetController, PopoverController, ModalController, IonSelect, IonSelectOption, IonItem, IonInput } from '@ionic/angular/standalone';
import { FinancialService, Transaction } from '../../services/financial/financial';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, alertCircleOutline, timeOutline, calendarOutline, add, arrowUp, arrowDown, chevronBack, chevronForward, search, chevronDown, helpCircleOutline, trash, close, createOutline } from 'ionicons/icons';
import { format, parseISO, isSameDay, isBefore, isSameMonth, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActionsPopoverComponent } from '../receivables/receivables-list/actions-popover.component';

@Component({
  selector: 'app-financial-list',
  templateUrl: './financial-list.page.html',
  styleUrls: ['./financial-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonCard, IonCardContent, IonBadge, IonIcon, IonButton, IonChip, IonRefresher, IonRefresherContent, IonFab, IonFabButton, IonSelect, IonSelectOption, IonItem, IonInput]
})
export class FinancialListPage implements OnInit {
  currentPeriod: Date = new Date(); // Still used for default view? Or fully custom date range? 
  // User asked for "Custom Date Range". Let's support both: Period Selector (Month) OR Custom Range.
  // Actually, let's keep it simple: Start/End Date is the source of truth.

  startDate: string = '';
  endDate: string = '';

  displayedItems: Transaction[] = [];
  totalItems = 0;

  // Pagination
  currentPage = 1;
  pageSize = 20;

  // Filters
  searchTerm: string = '';
  selectedCategoryId: string = '';
  selectedType: 'RECEITA' | 'DESPESA' | '' = '';
  isImporting: boolean = false;

  // Dependencies
  categories: any[] = [];

  kpis = {
    receivables: 0,
    payables: 0,
    balance: 0
  };

  selectedIds: Set<string> = new Set();

  constructor(
    private financialService: FinancialService,
    private categoriesService: CategoriesService, // Need this import
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController,
    private popoverCtrl: PopoverController,
    private modalCtrl: ModalController // Need for Edit
  ) {
    addIcons({ checkmarkCircleOutline, alertCircleOutline, timeOutline, calendarOutline, add, arrowUp, arrowDown, chevronBack, chevronForward, search, chevronDown, helpCircleOutline, trash, close, createOutline }); // Add createOutline

    // Initialize current month
    const now = new Date();
    this.setMonthRange(now);
  }

  ngOnInit() {
    this.loadCategories();
    this.loadData();
  }

  setMonthRange(date: Date) {
    this.currentPeriod = date;
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    this.startDate = format(start, 'yyyy-MM-dd');
    this.endDate = format(end, 'yyyy-MM-dd');
  }

  loadCategories() {
    this.categoriesService.findAll().subscribe(cats => this.categories = cats);
  }

  loadData(event?: any) {
    const skip = (this.currentPage - 1) * this.pageSize;

    this.financialService.getTransactions({
      startDate: this.startDate,
      endDate: this.endDate,
      categoryId: this.selectedCategoryId,
      tipo: this.selectedType || undefined,
      search: this.searchTerm,
      skip: skip,
      take: this.pageSize
    }).subscribe({
      next: (res) => {
        this.displayedItems = res.data;
        this.totalItems = res.total;

        this.calculateKpis(res.data); // Note: KPIs currently only reflect the PAGE data + backend logic if we wanted full totals. 
        // For accurate KPIs of the *Period*, we would need a separate endpoint or aggregate query.
        // User asked for "Alimentar dashboard", and this list has "KPI Cards". 
        // Showing KPIs only for the visible page is misleading. 
        // However, the backend findAll returns { total, data }. It does NOT return "sum of all matching".
        // For now, I will aggregate locally what I see, but ideally we need an endpoint for totals.
        // Let's stick to local aggregation for now to respect scope, but acknowledge this limitation or check if I can quick fix it.
        // Actually... I can't easily get full totals without another query.

        if (event) event.target.complete();
      },
      error: (err) => {
        console.error(err);
        if (event) event.target.complete();
      }
    });
  }

  calculateKpis(items: Transaction[]) {
    // Temporary: Calculate on loaded items.
    // Ideally should be independent of pagination.
    let rec = 0;
    let pay = 0;
    items.forEach(item => {
      const val = Number(item.valor);
      if (item.tipo === 'RECEITA') rec += val;
      else pay += val;
    });
    this.kpis = { receivables: rec, payables: pay, balance: rec - pay };
  }

  changePage(newPage: number) {
    this.currentPage = newPage;
    this.loadData();
  }

  // Custom Filter Logic
  onSearchChange() {
    this.currentPage = 1;
    this.loadData();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadData();
  }

  toggleTypeFilter(type: 'RECEITA' | 'DESPESA') {
    if (this.selectedType === type) {
      this.selectedType = '';
    } else {
      this.selectedType = type;
    }
    this.currentPage = 1;
    this.loadData();
  }

  changePeriod(direction: number) {
    const newDate = new Date(this.currentPeriod);
    newDate.setMonth(newDate.getMonth() + direction);
    this.setMonthRange(newDate);
    this.currentPage = 1; // Reset page
    this.loadData();
  }

  get periodLabel(): string {
    return format(this.currentPeriod, 'MMMM yyyy', { locale: ptBR });
  }

  toggleSelection(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  toggleAll() {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.displayedItems.forEach(item => {
        if (item.id) this.selectedIds.add(item.id);
      });
    }
  }

  get allSelected(): boolean {
    return this.displayedItems.length > 0 && this.displayedItems.every(item => item.id && this.selectedIds.has(item.id));
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  async openBulkActions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Ações em Lote',
      subHeader: `${this.selectedIds.size} itens selecionados`,
      buttons: [
        {
          text: 'Marcar como Pago/Recebido',
          icon: 'checkmark-circle-outline',
          handler: () => {
            this.processBulkPayment();
          }
        },
        {
          text: 'Excluir',
          role: 'destructive',
          icon: 'trash',
          handler: () => {
            this.processBulkDelete();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close'
        },
      ],
    });
    await actionSheet.present();
  }

  async processBulkPayment() {
    const loading = await this.loadingCtrl.create({ message: 'Processando...' });
    await loading.present();

    const observables = Array.from(this.selectedIds).map(id => {
      const item = this.displayedItems.find(t => t.id === id);
      const isPaid = item && (item.status === 'REALIZADO' || item.status === 'CONCILIADO');
      if (item && !isPaid) {
        return this.financialService.updateTransaction(id, {
          status: 'REALIZADO',
          dataPagamento: new Date().toISOString()
        });
      }
      return null;
    }).filter(obs => obs !== null);

    if (observables.length === 0) {
      await loading.dismiss();
      this.showToast('Nenhum item pendente para atualizar.', 'warning');
      return;
    }

    let successCount = 0;
    for (const obs of observables) {
      if (obs) {
        try {
          await obs.toPromise();
          successCount++;
        } catch (e) {
          console.error(e);
        }
      }
    }

    await loading.dismiss();
    this.showToast(`${successCount} lançamentos processados com sucesso.`);
    this.selectedIds.clear();
    this.loadData();
  }

  async processBulkDelete() {
    const loading = await this.loadingCtrl.create({ message: 'Excluindo...' });
    await loading.present();

    const idsToDelete = Array.from(this.selectedIds);
    let successCount = 0;

    for (const id of idsToDelete) {
      try {
        await this.financialService.deleteTransaction(id).toPromise();
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }

    await loading.dismiss();
    this.showToast(`${successCount} itens excluídos com sucesso.`);
    this.selectedIds.clear();
    this.loadData();
  }

  async openTransactionModal(item?: Transaction) {
    const modal = await this.modalCtrl.create({
      component: TransactionModalComponent,
      componentProps: {
        transaction: item,
        type: item ? item.tipo : 'DESPESA'
      }
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'save' && data) {
      if (item) {
        // Edit flow
        this.financialService.updateTransaction(item.id!, data).subscribe({
          next: () => {
            this.loadData();
            this.showToast('Transação atualizada com sucesso!');
          },
          error: (err) => {
            console.error(err);
            this.showToast('Erro ao atualizar transação.', 'danger');
          }
        });
      } else {
        // Create flow (if needed here, though explicit button typically exists)
        this.financialService.createTransaction(data).subscribe({
          next: () => {
            this.loadData();
            this.showToast('Transação criada com sucesso!');
          },
          error: (err) => {
            console.error(err);
            this.showToast('Erro ao criar transação.', 'danger');
          }
        });
      }
    }
  }

  async openItemActions(event: Event, item: Transaction) {
    event.stopPropagation();

    const actions = [];
    const isPaid = item.status === 'REALIZADO' || item.status === 'CONCILIADO';

    if (!isPaid) {
      actions.push({
        text: item.tipo === 'RECEITA' ? 'Marcar como Recebido' : 'Marcar como Pago',
        icon: 'checkmark-circle-outline',
        id: 'pay'
      });
    }

    // Add Edit Action
    actions.push({
      text: 'Editar',
      icon: 'create-outline',
      id: 'edit'
    });

    actions.push({
      text: 'Excluir',
      icon: 'trash',
      role: 'destructive',
      id: 'delete'
    });

    const popover = await this.popoverCtrl.create({
      component: ActionsPopoverComponent,
      event: event,
      componentProps: { actions: actions },
      alignment: 'end',
      showBackdrop: false,
      cssClass: 'custom-actions-popover'
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();

    if (data && data.action) {
      if (data.action.id === 'pay') {
        this.markAsCompleted(item);
      } else if (data.action.id === 'delete') {
        this.deleteItem(item);
      } else if (data.action.id === 'edit') {
        this.openTransactionModal(item);
      }
    }
  }

  async markAsCompleted(item: Transaction) {
    const loading = await this.loadingCtrl.create({ message: 'Processando...' });
    await loading.present();

    this.financialService.updateTransaction(item.id!, {
      status: 'REALIZADO',
      dataPagamento: new Date().toISOString()
    }).subscribe({
      next: async () => {
        await loading.dismiss();
        this.showToast('Lançamento atualizado!', 'success');
        this.loadData();
      },
      error: async () => {
        await loading.dismiss();
        this.showToast('Erro ao atualizar.', 'danger');
      }
    });
  }

  async deleteItem(item: Transaction) {
    const loading = await this.loadingCtrl.create({ message: 'Excluindo...' });
    await loading.present();

    this.financialService.deleteTransaction(item.id!).subscribe({
      next: async () => {
        await loading.dismiss();
        this.showToast('Item excluído com sucesso.');
        this.loadData();
      },
      error: async (err) => {
        await loading.dismiss();
        console.error(err);
        this.showToast('Erro ao excluir item.', 'danger');
      }
    });
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

  // --- Bulk CSV Export ---
  exportCSV() {
    const headers = ['Competência', 'Tipo', 'Descrição', 'Cliente/Fornecedor', 'Cond. Pagto', 'Valor', 'Situação'];

    const rows = this.displayedItems.map(item => {
      return [
        `"${item.dataVencimento ? new Date(item.dataVencimento).toISOString().split('T')[0] : ''}"`,
        `"${item.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}"`,
        `"${item.descricao || ''}"`,
        `"${item.clienteId ? 'Cliente' : (item.fornecedor || '-')}"`,
        `"${item.formaPagamento || 'À vista'}"`,
        item.valor || 0,
        `"${item.status}"`
      ].join(',');
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lancamentos_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Bulk CSV Import ---
  downloadCsvTemplate() {
    const headers = ['Vencimento (YYYY-MM-DD)', 'Tipo (RECEITA/DESPESA)', 'Descricao', 'Valor', 'Status (PREVISTO/REALIZADO)'];
    const csvContent = headers.join(',') + '\n2025-12-31,RECEITA,Servico X,150.50,PREVISTO\n2025-12-31,DESPESA,Material Y,50.00,REALIZADO';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modelo_importacao_lancamentos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  onCsvSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      this.processCsvData(text);
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  processCsvData(csvText: string) {
    const lines = csvText.split('\n');
    const transactions: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',');
      if (cols.length < 4) continue;

      const rawTipo = (cols[1]?.trim().toUpperCase() === 'DESPESA') ? 'DESPESA' : 'RECEITA';

      const t: any = {
        tipo: rawTipo,
        dataVencimento: cols[0]?.trim() ? new Date(cols[0].trim()).toISOString() : new Date().toISOString(),
        descricao: cols[2]?.trim() || 'Lançamento Importado',
        valor: parseFloat(cols[3]?.trim() || '0'),
        status: (cols[4]?.trim().toUpperCase() === 'REALIZADO') ? 'REALIZADO' : 'PREVISTO',
      };

      if (t.status === 'REALIZADO') {
        t.dataPagamento = new Date().toISOString(); // Simple default
      }

      if (t.descricao && t.valor > 0) {
        transactions.push(t);
      }
    }

    if (transactions.length > 0) {
      this.uploadTransactions(transactions);
    } else {
      this.showToast('Nenhum dado válido encontrado no arquivo.', 'danger');
    }
  }

  async uploadTransactions(transactions: any[]) {
    this.isImporting = true;
    const loading = await this.loadingCtrl.create({ message: 'Importando...' });
    await loading.present();

    this.financialService.createManyTransactions(transactions).subscribe({
      next: async (res: any) => {
        this.isImporting = false;
        await loading.dismiss();
        this.showToast(`${res.created} lançamentos importados com sucesso!`);
        this.loadData();
      },
      error: async (err) => {
        this.isImporting = false;
        await loading.dismiss();
        console.error(err);
        this.showToast('Falha ao importar lançamentos. Verifique o padrão do arquivo.', 'danger');
      }
    });
  }
}
