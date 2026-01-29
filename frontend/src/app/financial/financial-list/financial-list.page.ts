import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonCard, IonCardContent, IonBadge, IonIcon, IonButton, IonChip, ToastController, LoadingController, IonRefresher, IonRefresherContent, IonFab, IonFabButton, ActionSheetController, PopoverController } from '@ionic/angular/standalone';
import { FinancialService, Transaction } from '../../services/financial/financial';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, alertCircleOutline, timeOutline, calendarOutline, add, arrowUp, arrowDown, chevronBack, chevronForward, search, chevronDown, helpCircleOutline, trash, close } from 'ionicons/icons';
import { format, parseISO, isSameDay, isBefore, isSameMonth, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActionsPopoverComponent } from '../receivables/receivables-list/actions-popover.component';

@Component({
  selector: 'app-financial-list',
  templateUrl: './financial-list.page.html',
  styleUrls: ['./financial-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonCard, IonCardContent, IonBadge, IonIcon, IonButton, IonChip, IonRefresher, IonRefresherContent, IonFab, IonFabButton]
})
export class FinancialListPage implements OnInit {
  currentPeriod: Date = new Date();
  allTransactions: Transaction[] = [];
  displayedItems: Transaction[] = [];
  searchTerm: string = '';

  kpis = {
    receivables: 0,
    payables: 0,
    balance: 0
  };

  selectedIds: Set<string> = new Set();

  constructor(
    private financialService: FinancialService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController,
    private popoverCtrl: PopoverController
  ) {
    addIcons({ checkmarkCircleOutline, alertCircleOutline, timeOutline, calendarOutline, add, arrowUp, arrowDown, chevronBack, chevronForward, search, chevronDown, helpCircleOutline, trash, close });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData(event?: any) {
    this.financialService.getTransactions().subscribe({
      next: (data) => {
        this.allTransactions = data;
        this.updateView();
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error(err);
        if (event) event.target.complete();
      }
    });
  }

  changePeriod(direction: number) {
    const newDate = new Date(this.currentPeriod);
    newDate.setMonth(newDate.getMonth() + direction);
    this.currentPeriod = newDate;
    this.updateView();
  }

  updateView() {
    this.selectedIds.clear();

    // 1. Filter items for the selected month
    this.displayedItems = this.allTransactions.filter(item => {
      const dueDate = parseISO(item.dataVencimento);
      const matchesPeriod = isSameMonth(dueDate, this.currentPeriod);

      if (!matchesPeriod) return false;

      if (!this.searchTerm) return true;
      const term = this.searchTerm.toLowerCase();
      return item.descricao && item.descricao.toLowerCase().includes(term);
    });

    // Sort by date correctly
    this.displayedItems.sort((a, b) => {
      return parseISO(a.dataVencimento).getTime() - parseISO(b.dataVencimento).getTime();
    });

    // 2. Calculate KPIs for the period
    let rec = 0;
    let pay = 0;

    this.displayedItems.forEach(item => {
      const val = Number(item.valor);
      if (item.tipo === 'RECEITA') {
        rec += val;
      } else {
        pay += val;
      }
    });

    this.kpis = {
      receivables: rec,
      payables: pay,
      balance: rec - pay
    };
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
      const item = this.allTransactions.find(t => t.id === id);
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
}
