
import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FinancialService, Transaction, BankAccount } from '../../services/financial/financial';
import { CategoriesService } from '../../services/financial/categories.service';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';
import {
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonRefresher,
    IonRefresherContent, IonButton, IonInput, IonPopover,
    IonCheckbox, IonNote, IonChip, ToastController, LoadingController, AlertController,
    ModalController, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    checkmarkCircleOutline, walletOutline, arrowUpCircle, arrowDownCircle,
    alertCircleOutline, add, chevronBackOutline, chevronForwardOutline,
    arrowUp, arrowDown, filterOutline, receiptOutline, searchOutline,
    printOutline, downloadOutline, cloudUploadOutline, ellipsisVerticalOutline,
    settingsOutline, refreshOutline, barcodeOutline, listCircleOutline,
    timeOutline, gitCompareOutline
} from 'ionicons/icons';
import {
    format, parseISO, isSameDay, isBefore, isAfter, startOfDay,
    endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfYear, endOfYear, subDays, subMonths, isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColumnSettings {
    date: boolean;
    description: boolean;
    situation: boolean;
    value: boolean;
    balance: boolean;
}

@Component({
    selector: 'app-statements',
    templateUrl: './statements.page.html',
    styleUrls: ['./statements.page.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterModule, IonHeader, IonToolbar, IonButtons,
        IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel,
        IonIcon, IonRefresher, IonRefresherContent,
        IonButton, IonInput,
        IonPopover, IonCheckbox, IonNote, IonChip,
        IonSelect, IonSelectOption
    ],
    providers: [CurrencyPipe]
})
export class StatementsPage implements OnInit {
    // Data
    transactions: Transaction[] = [];
    filteredTransactions: Transaction[] = [];
    bankAccounts: BankAccount[] = [];

    // Filters
    periodFilter: string = 'month'; // today, week, month, year, last30, last12, all, custom
    currentPeriod: Date = new Date();
    startDate?: string;
    endDate?: string;
    searchQuery: string = '';
    selectedAccountIds: string[] = [];
    selectedIds: Set<string> = new Set<string>();
    isMoreFiltersActive: boolean = false;

    // Pagination
    currentPage = 1;
    pageSize = 20;
    totalPages = 1;
    paginatedTransactions: Transaction[] = [];

    // Category Filter
    categories: any[] = [];
    selectedCategoryId: string = '';

    // KPIs
    receiptsOpen = 0;
    receiptsRealized = 0;
    expensesOpen = 0;
    expensesRealized = 0;
    periodTotal = 0;

    // UI State
    loading = false;
    columns: ColumnSettings = {
        date: true,
        description: true,
        situation: true,
        value: true,
        balance: true
    };
    @ViewChild('newPopover') newPopover: any;

    constructor(
        private financialService: FinancialService,
        private categoriesService: CategoriesService,
        private modalCtrl: ModalController,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private alertCtrl: AlertController,
        private router: Router
    ) {
        addIcons({
            checkmarkCircleOutline, walletOutline, arrowUpCircle, arrowDownCircle,
            alertCircleOutline, add, chevronBackOutline, chevronForwardOutline,
            arrowUp, arrowDown, filterOutline, receiptOutline, searchOutline,
            printOutline, downloadOutline, cloudUploadOutline, ellipsisVerticalOutline,
            settingsOutline, refreshOutline, barcodeOutline, listCircleOutline,
            timeOutline, gitCompareOutline
        });
    }

    ngOnInit() {
        this.loadInitialData();
        this.loadCategories();
    }

    loadCategories() {
        this.categoriesService.findAll().subscribe(cats => this.categories = cats);
    }

    // ... (rest of methods)

    addReceita() {
        if (this.newPopover) this.newPopover.dismiss();
        this.router.navigate(['/financial/receivables/new']);
    }

    addDespesa() {
        if (this.newPopover) this.newPopover.dismiss();
        this.router.navigate(['/financial/payables/new']);
    }

    addTransferencia() {
        this.showToast('Nova Transferência - Em breve', 'primary');
        if (this.newPopover) this.newPopover.dismiss();
    }

    async loadInitialData() {
        this.loading = true;
        this.loadBankAccounts();
        this.loadTransactions();
    }

    loadBankAccounts() {
        this.financialService.getBankAccounts().subscribe({
            next: (accounts) => this.bankAccounts = accounts,
            error: (err) => console.error('Error loading accounts', err)
        });
    }

    loadTransactions(event?: any) {
        // Fetch all for local filtering based on the complex rules provided
        // We request a larger chunk because the backend defaults to 50 and we do the date filtering locally on the frontend here.
        this.financialService.getTransactions({ take: 10000 } as any).subscribe({
            next: (response: any) => {
                this.transactions = response.data || response; // Handle both formats if transitional
                this.applyFilters();
                if (event) event.target.complete();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading transactions', err);
                if (event) event.target.complete();
                this.loading = false;
            }
        });
    }

    changePeriod(direction: number) {
        const newDate = new Date(this.currentPeriod);
        newDate.setMonth(newDate.getMonth() + direction);
        this.currentPeriod = newDate;
        this.periodFilter = 'month'; // Set to month mode when navigating
        this.applyFilters();
    }

    applyFilters() {
        const now = new Date();
        let start = startOfDay(now);
        let end = endOfDay(now);

        // Apply Period Filter
        switch (this.periodFilter) {
            case 'today':
                break;
            case 'week':
                start = startOfWeek(now, { locale: ptBR });
                end = endOfWeek(now, { locale: ptBR });
                break;
            case 'month':
                start = startOfMonth(this.currentPeriod);
                end = endOfMonth(this.currentPeriod);
                break;
            case 'year':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case 'last30':
                start = startOfDay(subDays(now, 30));
                end = endOfDay(now);
                break;
            case 'last12':
                start = startOfDay(subMonths(now, 12));
                end = endOfDay(now);
                break;
            case 'custom':
                if (this.startDate && this.endDate) {
                    start = startOfDay(parseISO(this.startDate));
                    end = endOfDay(parseISO(this.endDate));
                }
                break;
            case 'all':
                start = new Date(0);
                end = new Date(9999, 11, 31);
                break;
        }

        this.filteredTransactions = this.transactions.filter(t => {
            const tDate = parseISO(t.dataVencimento);
            const inPeriod = isWithinInterval(tDate, { start, end });

            // Search logic enhanced
            let catName = '';
            if (t.categoriaId) {
                const c = this.categories.find(c => c.id === t.categoriaId);
                if (c) catName = c.nome.toLowerCase();
            }

            const query = this.searchQuery.toLowerCase();
            const matchesSearch = !this.searchQuery ||
                t.descricao.toLowerCase().includes(query) ||
                (t.fornecedor && t.fornecedor.toLowerCase().includes(query)) ||
                catName.includes(query);

            const matchesAccount = this.selectedAccountIds.length === 0 ||
                (t.clienteId && this.selectedAccountIds.includes(t.clienteId));

            const matchesCategory = !this.selectedCategoryId || t.categoriaId === this.selectedCategoryId;

            return inPeriod && matchesSearch && matchesAccount && matchesCategory;
        });

        // Check if more filters are active (besides basic period)
        this.isMoreFiltersActive = this.searchQuery.length > 0 || this.selectedAccountIds.length > 0 || this.selectedCategoryId !== '';

        this.calculateKPIs();
        this.sortTransactions();
        this.calculateBalances();

        // Update Pagination
        this.currentPage = 1;
        this.updatePagination();
    }

    updatePagination() {
        this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.paginatedTransactions = this.filteredTransactions.slice(start, end);
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
        }
    }

    // New Action Methods
    async editTransaction(t: Transaction) {
        const modal = await this.modalCtrl.create({
            component: TransactionModalComponent,
            componentProps: {
                transaction: t,
                type: t.tipo
            }
        });

        await modal.present();
        const { role } = await modal.onWillDismiss();
        if (role === 'save') {
            this.loadTransactions();
            this.showToast('Lançamento atualizado!');
        }
    }

    async deleteTransaction(t: Transaction) {
        const alert = await this.alertCtrl.create({
            header: 'Excluir Lançamento',
            message: `Deseja excluir "${t.descricao}"?`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Excluir',
                    role: 'destructive',
                    handler: () => {
                        this.loading = true;
                        this.financialService.deleteTransaction(t.id!).subscribe({
                            next: () => {
                                this.showToast('Lançamento excluído.');
                                this.loadTransactions();
                            },
                            error: () => {
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

    calculateKPIs() {
        this.receiptsOpen = 0;
        this.receiptsRealized = 0;
        this.expensesOpen = 0;
        this.expensesRealized = 0;

        this.filteredTransactions.forEach(t => {
            const valor = Math.abs(Number(t.valor)); // Use absolute value for calculation to avoid double negative issues
            if (t.tipo === 'RECEITA') {
                if (t.status === 'PREVISTO') this.receiptsOpen += valor;
                else this.receiptsRealized += valor;
            } else {
                if (t.status === 'PREVISTO') this.expensesOpen += valor;
                else this.expensesRealized += valor;
            }
        });

        // USER Fix: Total do Período = Receitas Realizadas - Despesas Realizadas
        this.periodTotal = this.receiptsRealized - this.expensesRealized;
    }

    getPeriodLabel() {
        switch (this.periodFilter) {
            case 'today': return 'Hoje';
            case 'week': return 'Esta semana';
            case 'month': return format(this.currentPeriod, 'MMMM yyyy', { locale: ptBR });
            case 'year': return 'Este ano';
            case 'last30': return 'Últimos 30 dias';
            case 'last12': return 'Últimos 12 meses';
            case 'custom':
                if (this.startDate && this.endDate) {
                    return `Baixa: ${format(parseISO(this.startDate), 'dd/MM/yyyy')} até ${format(parseISO(this.endDate), 'dd/MM/yyyy')}`;
                }
                return 'Período personalizado';
            default: return format(this.currentPeriod, 'MMMM yyyy', { locale: ptBR });
        }
    }

    get periodLabel(): string {
        return format(this.currentPeriod, 'MMMM yyyy', { locale: ptBR });
    }

    getFooterDateRange() {
        let start = startOfMonth(this.currentPeriod);
        let end = endOfMonth(this.currentPeriod);

        if (this.periodFilter === 'custom' && this.startDate && this.endDate) {
            start = parseISO(this.startDate);
            end = parseISO(this.endDate);
        } else if (this.periodFilter === 'month') {
            // Default month logic
        } else {
            // Adjust based on current filters if needed
        }

        return `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`;
    }

    resetPeriod() {
        this.periodFilter = 'all';
        this.applyFilters();
    }

    clearAllFilters() {
        this.periodFilter = 'all';
        this.searchQuery = '';
        this.selectedAccountIds = [];
        this.applyFilters();
    }

    sortTransactions() {
        this.filteredTransactions.sort((a, b) => {
            return parseISO(a.dataVencimento).getTime() - parseISO(b.dataVencimento).getTime();
        });
    }

    calculateBalances() {
        const today = startOfDay(new Date());
        let runningBalance = 0;

        // Rule: Lançamentos a vencer impactam o saldo. Vencidos não.
        // However, usually running balance in a statement is cumulative.
        // USER Rule: "Apenas os lançamentos a vencer impactam o valor exibido na coluna Saldo (R$). Já os lançamentos vencidos não entram no cálculo do saldo acumulado mesmo que ainda estejam Em aberto."

        this.filteredTransactions.forEach(t => {
            const tDate = parseISO(t.dataVencimento);
            const valor = Number(t.valor);
            const isFuture = !isBefore(tDate, today);

            if (isFuture) {
                if (t.tipo === 'RECEITA') runningBalance += valor;
                else runningBalance -= valor;
            }

            // In the statement view, expenses are often shown as negative in the value column too
            if (t.tipo === 'DESPESA' && t.valor > 0) {
                t.valor = Number(t.valor) * -1;
            }

            (t as any).runningBalance = runningBalance;
        });
    }

    // Selection Logic
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
            this.filteredTransactions.forEach(t => {
                if (t.id) this.selectedIds.add(t.id);
            });
        }
    }

    isSelected(id: string): boolean {
        return this.selectedIds.has(id);
    }

    get allSelected(): boolean {
        return this.filteredTransactions.length > 0 &&
            this.selectedIds.size === this.filteredTransactions.length;
    }

    async openBulkActions() {
        // Implement bulk actions popover or sheet
        this.showToast(`${this.selectedIds.size} itens selecionados`, 'primary');
    }

    toggleColumn(column: keyof ColumnSettings) {
        this.columns[column] = !this.columns[column];
    }

    restoreDefaults() {
        this.columns = {
            date: true,
            description: true,
            situation: true,
            value: true,
            balance: true
        };
    }

    async exportCSV() {
        const header = "Data,Descricao,Situacao,Valor (R$),Saldo (R$)\n";
        const rows = this.filteredTransactions.map(t => {
            return `${t.dataVencimento},${t.descricao},${t.status},${t.valor},${(t as any).runningBalance}`;
        }).join("\n");

        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extrato_movimentacao_${format(new Date(), 'yyyyMMdd')}.csv`;
        a.click();

        this.showToast('Exportação concluída!', 'success');
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

    formatDate(dateStr: string) {
        return format(parseISO(dateStr), 'dd/MM/yyyy');
    }

    getStatusColor(status: string) {
        switch (status) {
            case 'REALIZADO':
            case 'CONCILIADO': return 'success';
            case 'PREVISTO': return 'warning';
            case 'CANCELADO': return 'danger';
            default: return 'medium';
        }
    }

    getStatusLabel(status: string, tipo?: string) {
        if (status === 'REALIZADO' || status === 'CONCILIADO') {
            return tipo === 'RECEITA' ? 'Recebido' : 'Pago';
        }
        switch (status) {
            case 'PREVISTO': return 'Em Aberto';
            case 'CANCELADO': return 'Cancelado';
            default: return status;
        }
    }


}
