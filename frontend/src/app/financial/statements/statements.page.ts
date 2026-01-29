
import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FinancialService, Transaction, BankAccount } from '../../services/financial/financial';
import {
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonRefresher,
    IonRefresherContent, IonButton, IonInput, IonPopover,
    IonCheckbox, IonNote, IonChip, ToastController, LoadingController, AlertController
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
        IonPopover, IonCheckbox, IonNote, IonChip
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
        this.financialService.getTransactions().subscribe({
            next: (data) => {
                this.transactions = data;
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

            const matchesSearch = !this.searchQuery ||
                t.descricao.toLowerCase().includes(this.searchQuery.toLowerCase());

            const matchesAccount = this.selectedAccountIds.length === 0 ||
                (t.clienteId && this.selectedAccountIds.includes(t.clienteId)); // Using client as proxy if specific account not in transaction

            return inPeriod && matchesSearch && matchesAccount;
        });

        // Check if more filters are active (besides basic period)
        this.isMoreFiltersActive = this.searchQuery.length > 0 || this.selectedAccountIds.length > 0;

        this.calculateKPIs();
        this.sortTransactions();
        this.calculateBalances();
    }

    calculateKPIs() {
        this.receiptsOpen = 0;
        this.receiptsRealized = 0;
        this.expensesOpen = 0;
        this.expensesRealized = 0;

        this.filteredTransactions.forEach(t => {
            const valor = Number(t.valor);
            if (t.tipo === 'RECEITA') {
                if (t.status === 'PREVISTO') this.receiptsOpen += valor;
                else this.receiptsRealized += valor;
            } else {
                if (t.status === 'PREVISTO') this.expensesOpen += valor;
                else this.expensesRealized += valor;
            }
        });

        // The period total in the mockup is receipts realized - expenses realized
        this.periodTotal = this.receiptsRealized - Number(this.expensesRealized);
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
