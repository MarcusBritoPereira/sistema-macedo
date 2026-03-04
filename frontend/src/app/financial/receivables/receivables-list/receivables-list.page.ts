import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonCard, IonCardContent, IonBadge, IonIcon, IonButton, IonChip, ToastController, LoadingController, IonRefresher, IonRefresherContent, IonFab, IonFabButton, ActionSheetController } from '@ionic/angular/standalone';
import { FinancialService, Transaction } from '../../../services/financial/financial';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, alertCircleOutline, timeOutline, calendarOutline, add, arrowUp, chevronBack, chevronForward, search, chevronDown, helpCircleOutline, trash, close } from 'ionicons/icons';
import { format, parseISO, isSameDay, isBefore, isSameMonth, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PopoverController } from '@ionic/angular/standalone';
import { ActionsPopoverComponent } from './actions-popover.component';


@Component({
    selector: 'app-receivables-list',
    templateUrl: './receivables-list.page.html',
    styleUrls: ['./receivables-list.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonCard, IonCardContent, IonBadge, IonIcon, IonButton, IonChip, IonRefresher, IonRefresherContent, IonFab, IonFabButton]
})
export class ReceivablesListPage implements OnInit {
    currentPeriod: Date = new Date();
    allReceivables: Transaction[] = [];
    displayedItems: Transaction[] = [];
    searchTerm: string = '';
    isImporting: boolean = false;

    kpis = {
        overdue: 0,
        today: 0,
        future: 0,
        paid: 0,
        total: 0
    };

    selectedIds: Set<string> = new Set();

    constructor(
        private financialService: FinancialService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private actionSheetCtrl: ActionSheetController,
        private popoverCtrl: PopoverController
    ) {
        addIcons({ checkmarkCircleOutline, alertCircleOutline, timeOutline, calendarOutline, add, arrowUp, chevronBack, chevronForward, search, chevronDown, helpCircleOutline, trash, close });
    }

    ngOnInit() {
        this.loadData();
    }

    loadData(event?: any) {
        this.financialService.getTransactions({ tipo: 'RECEITA' }).subscribe({
            next: (response: any) => {
                this.allReceivables = response.data || response;
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

        // 1. Filter items for the selected month (for the list view)
        this.displayedItems = this.allReceivables.filter(item => {
            const dueDate = parseISO(item.dataVencimento);
            const matchesPeriod = isSameMonth(dueDate, this.currentPeriod);

            if (!matchesPeriod) return false;

            if (!this.searchTerm) return true;
            const term = this.searchTerm.toLowerCase();
            return item.descricao && item.descricao.toLowerCase().includes(term);
        });

        // 2. Calculate KPIs
        let overdue = 0;
        let dueToday = 0;
        let toReceive = 0; // A receber (Future in this month)
        let received = 0;
        let total = 0;

        const today = startOfDay(new Date());

        this.displayedItems.forEach(item => {
            const val = Number(item.valor);
            const dueDate = parseISO(item.dataVencimento);
            const isReceived = item.status === 'REALIZADO' || item.status === 'CONCILIADO';

            total += val;

            if (isReceived) {
                received += val;
            } else {
                if (isBefore(dueDate, today)) {
                    overdue += val;
                } else if (isSameDay(dueDate, today)) {
                    dueToday += val;
                } else {
                    toReceive += val;
                }
            }
        });

        this.kpis = { overdue, today: dueToday, future: toReceive, paid: received, total };
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
                    text: 'Marcar como Recebido',
                    icon: 'checkmark-circle-outline',
                    handler: () => {
                        this.processBulkReceipt();
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
                    icon: 'close',
                    data: {
                        action: 'cancel',
                    },
                },
            ],
        });
        await actionSheet.present();
    }

    async processBulkReceipt() {
        const loading = await this.loadingCtrl.create({ message: 'Processando...' });
        await loading.present();

        const observables = Array.from(this.selectedIds).map(id => {
            const item = this.allReceivables.find(r => r.id === id);
            const isReceived = item && (item.status === 'REALIZADO' || item.status === 'CONCILIADO');
            if (item && !isReceived) {
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
        this.showToast(`${successCount} recebimentos processados com sucesso.`);
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

    async markAsReceived(item: Transaction) {
        const loading = await this.loadingCtrl.create({ message: 'Processando...' });
        await loading.present();

        this.financialService.updateTransaction(item.id!, {
            status: 'REALIZADO',
            dataPagamento: new Date().toISOString()
        }).subscribe({
            next: async () => {
                await loading.dismiss();
                this.showToast('Recebimento confirmado!', 'success');
                this.loadData();
            },
            error: async () => {
                await loading.dismiss();
                this.showToast('Erro ao atualizar.', 'danger');
            }
        });
    }

    async openItemActions(event: Event, item: Transaction) {
        event.stopPropagation(); // Prevent row click/other events

        const actions = [];

        const isReceived = item.status === 'REALIZADO' || item.status === 'CONCILIADO';

        if (!isReceived) {
            actions.push({
                text: 'Marcar como Recebido',
                icon: 'checkmark-circle-outline',
                id: 'receive'
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
            componentProps: {
                actions: actions
            },
            alignment: 'end',
            showBackdrop: false,
            cssClass: 'custom-actions-popover'
        });

        await popover.present();

        const { data } = await popover.onDidDismiss();

        if (data && data.action) {
            const actionId = data.action.id;
            if (actionId === 'receive') {
                this.markAsReceived(item);
            } else if (actionId === 'delete') {
                this.deleteItem(item);
            }
        }
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
        const headers = ['Vencimento', 'Recebimento', 'Descrição', 'Cliente', 'Valor Total', 'Valor Recebido', 'Situação'];

        const rows = this.displayedItems.map(item => {
            const isReceived = item.status === 'REALIZADO' || item.status === 'CONCILIADO';
            return [
                `"${item.dataVencimento ? new Date(item.dataVencimento).toISOString().split('T')[0] : ''}"`,
                `"${isReceived && item.dataPagamento ? new Date(item.dataPagamento).toISOString().split('T')[0] : ''}"`,
                `"${item.descricao || ''}"`,
                `"${item.cliente?.nomeFantasia || item.cliente?.razaoSocial || ''}"`,
                item.valor || 0,
                isReceived ? (item.valor || 0) : 0,
                `"${isReceived ? 'Recebido' : 'Em aberto'}"`
            ].join(',');
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `contas_a_receber_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Bulk CSV Import ---
    downloadCsvTemplate() {
        const headers = ['Vencimento (YYYY-MM-DD)', 'Descricao', 'Valor', 'Status (PREVISTO/REALIZADO)', 'Pagamento (YYYY-MM-DD)'];
        const csvContent = headers.join(',') + '\n2025-12-31,Projeto Alpha,150.50,PREVISTO,';

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'modelo_importacao_receber.csv');
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
            if (cols.length < 3) continue;

            const t: any = {
                tipo: 'RECEITA',
                dataVencimento: cols[0]?.trim() ? new Date(cols[0].trim()).toISOString() : new Date().toISOString(),
                descricao: cols[1]?.trim() || 'Receita Importada',
                valor: parseFloat(cols[2]?.trim() || '0'),
                status: (cols[3]?.trim().toUpperCase() === 'REALIZADO') ? 'REALIZADO' : 'PREVISTO',
            };

            if (cols[4]?.trim() && t.status === 'REALIZADO') {
                t.dataPagamento = new Date(cols[4].trim()).toISOString();
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
