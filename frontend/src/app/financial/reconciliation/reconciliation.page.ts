import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonSegment, IonSegmentButton,
    IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonNote,
    IonChip, ToastController, LoadingController, AlertController, IonRefresher,
    IonRefresherContent, IonInput, IonSelect, IonSelectOption, IonSpinner,
    IonSearchbar, IonCheckbox, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    receiptOutline, syncOutline, checkmarkCircleOutline, alertCircleOutline,
    linkOutline, addOutline, arrowForwardOutline, searchOutline, filterOutline,
    closeCircleOutline, informationCircleOutline, chevronDown, optionsOutline,
    cloudUploadOutline, chevronBackOutline, chevronForwardOutline,
    calendarOutline, cashOutline, walletOutline, arrowUpOutline, arrowDownOutline,
    trashBinOutline, createOutline, ellipsisVerticalOutline, closeOutline,
    funnelOutline, businessOutline, checkmarkCircle, helpCircleOutline,
    chevronUpOutline, chevronDownOutline
} from 'ionicons/icons';
import { ReconciliationService } from '../../services/financial/reconciliation.service';
import { FinancialService, BankAccount } from '../../services/financial/financial';
import { BankStatement, SuggestedMatch } from '../../services/financial/reconciliation';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReconciliationDetailComponent } from './components/reconciliation-detail/reconciliation-detail.component';

@Component({
    selector: 'app-reconciliation',
    templateUrl: './reconciliation.page.html',
    styleUrls: ['./reconciliation.page.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterLink,
        IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
        IonList, IonItem, IonLabel, IonIcon, IonButton,
        IonSegment, IonSegmentButton, IonBadge, IonCard, IonCardHeader, IonCardTitle,
        IonCardContent, IonNote, IonChip, IonRefresher, IonRefresherContent,
        IonInput, IonSelect, IonSelectOption, IonSpinner, IonSearchbar,
        IonCheckbox,
        ReconciliationDetailComponent
    ]
})
export class ReconciliationPage implements OnInit {
    bankAccounts: BankAccount[] = [];
    selectedAccountId: string = '';
    selectedAccount: BankAccount | null = null;

    statements: BankStatement[] = [];
    filteredStatements: BankStatement[] = [];
    selectedStatement: BankStatement | null = null;
    expandedStatementId: string | null = null;
    suggestions: SuggestedMatch[] = [];

    // Filter and View State
    filterStatus: 'PENDING' | 'CONCILIATED' | 'ALL' = 'PENDING';
    filterType: 'ALL' | 'CREDIT' | 'DEBIT' = 'ALL';
    viewMode: 'PENDING' | 'MOVEMENTS' = 'PENDING';
    searchTerm: string = '';

    // Period State
    currentDate: Date = new Date();

    // Summary Stats
    summary = {
        totalCount: 0,
        receivablesCount: 0,
        payablesCount: 0,
        totalPendingValue: 0
    };

    illustrationLoaded = true;
    loading = false;

    constructor(
        private route: ActivatedRoute,
        private reconciliationService: ReconciliationService,
        private financialService: FinancialService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private alertCtrl: AlertController,
        private modalCtrl: ModalController
    ) {
        addIcons({
            receiptOutline, syncOutline, checkmarkCircleOutline, alertCircleOutline,
            linkOutline, addOutline, arrowForwardOutline, searchOutline, filterOutline,
            closeCircleOutline, informationCircleOutline, chevronDown, optionsOutline,
            cloudUploadOutline, chevronBackOutline, chevronForwardOutline,
            calendarOutline, cashOutline, walletOutline, arrowUpOutline, arrowDownOutline,
            trashBinOutline, createOutline, ellipsisVerticalOutline, closeOutline,
            funnelOutline, businessOutline, checkmarkCircle, helpCircleOutline,
            chevronUpOutline, chevronDownOutline
        });
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const accId = params['accountId'];
            this.loadAccounts(accId);
        });
    }

    setViewMode(mode: 'PENDING' | 'MOVEMENTS') {
        this.viewMode = mode;
        this.filterStatus = (mode === 'PENDING') ? 'PENDING' : 'ALL';
        this.loadStatements();
    }

    loadAccounts(targetId?: string) {
        this.financialService.getBankAccounts().subscribe({
            next: (accounts) => {
                this.bankAccounts = accounts;
                if (accounts.length > 0) {
                    this.selectedAccountId = targetId || accounts[0].id;
                    this.loadStatements();
                }
            }
        });
    }

    loadStatements(event?: any) {
        if (!this.selectedAccountId) return;
        this.loading = true;

        this.selectedAccount = this.bankAccounts.find(a => a.id === this.selectedAccountId) || null;

        const filters = {
            startDate: this.filterStatus === 'PENDING' ? undefined : format(startOfMonth(this.currentDate), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(this.currentDate), 'yyyy-MM-dd'),
            status: this.filterStatus === 'ALL' ? undefined : this.filterStatus
        };

        this.reconciliationService.getStatements(this.selectedAccountId, filters).subscribe({
            next: (data) => {
                this.statements = data;
                this.calculateSummary();
                this.applySearch();
                this.loading = false;
                if (event) event.target.complete();
            },
            error: () => {
                this.loading = false;
                if (event) event.target.complete();
            }
        });
    }

    calculateSummary() {
        this.summary.totalCount = this.statements.length;
        this.summary.receivablesCount = this.statements.filter(s => s.tipo === 'CREDIT').length;
        this.summary.payablesCount = this.statements.filter(s => s.tipo === 'DEBIT').length;
        this.summary.totalPendingValue = this.statements
            .filter(s => !s.conciliado)
            .reduce((acc, s) => acc + Math.abs(Number(s.valor)), 0);
    }

    setFilterType(type: 'ALL' | 'CREDIT' | 'DEBIT') {
        this.filterType = type;
        this.applySearch();
    }

    applySearch() {
        let filtered = [...this.statements];

        if (this.filterType !== 'ALL') {
            filtered = filtered.filter(s => s.tipo === this.filterType);
        }

        if (this.searchTerm.trim()) {
            const query = this.searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.descricao.toLowerCase().includes(query) ||
                s.valor.toString().includes(query)
            );
        }

        this.filteredStatements = filtered;
    }

    onSearch(event: any) {
        this.searchTerm = event.target.value;
        this.applySearch();
    }

    nextMonth() {
        this.currentDate = addMonths(this.currentDate, 1);
        this.loadStatements();
    }

    prevMonth() {
        this.currentDate = subMonths(this.currentDate, 1);
        this.loadStatements();
    }

    getPeriodLabel() {
        const label = format(this.currentDate, "MMMM 'de' yyyy", { locale: ptBR });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    toggleExpand(statement: BankStatement) {
        if (this.expandedStatementId === statement.id) {
            this.expandedStatementId = null;
        } else {
            this.expandedStatementId = statement.id;
        }
    }

    onDetailAction(event: any) {
        this.expandedStatementId = null;
        this.loadStatements();
        if (event && event.action === 'created') this.showToast('Conciliação criada com sucesso!');
        if (event && event.action === 'linked') this.showToast('Conciliação vinculada com sucesso!');
    }

    async showDefaultIcon(event: any) {
        event.target.src = 'assets/icon/favicon.png';
    }

    showIllustrationError(event: any) {
        this.illustrationLoaded = false;
    }

    async syncBank() {
        if (!this.selectedAccountId) return;
        const loader = await this.loadingCtrl.create({ message: 'Sincronizando com o Banco...' });
        await loader.present();

        this.reconciliationService.sync(this.selectedAccountId).subscribe({
            next: (res) => {
                loader.dismiss();
                this.showToast(`${res.imported} novos itens importados`);
                this.loadStatements();
            },
            error: (err) => {
                loader.dismiss();
                this.showToast(err.message || 'Erro na sincronização', 'danger');
            }
        });
    }

    formatDate(dateStr: string | Date | undefined | null) {
        if (!dateStr) return '-';
        try {
            const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
            return format(date, 'dd/MM/yyyy');
        } catch (e) {
            return '-';
        }
    }

    formatDateTime(dateStr: string | Date | undefined | null) {
        if (!dateStr) return '-';
        try {
            const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
            return format(date, "dd/MM/yyyy 'às' HH:mm");
        } catch (e) {
            return '-';
        }
    }

    async showToast(msg: string, color: string = 'success') {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 3000,
            color: color,
            position: 'bottom'
        });
        toast.present();
    }
}
