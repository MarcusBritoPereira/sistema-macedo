import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonSegment, IonSegmentButton,
    IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonNote,
    IonChip, ToastController, LoadingController, AlertController, IonRefresher,
    IonInput, IonSelect, IonSelectOption, IonSpinner, IonSearchbar, IonCheckbox,
    IonAccordion, IonAccordionGroup, IonRefresherContent, ModalController
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
    chevronUpOutline, chevronDownOutline, layersOutline, alertCircle, trashOutline
} from 'ionicons/icons';
import { ReconciliationService } from '../../services/financial/reconciliation.service';
import { FinancialService, BankAccount } from '../../services/financial/financial';
import { BankStatement, SuggestedMatch } from '../../services/financial/reconciliation';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReconciliationDetailComponent } from './components/reconciliation-detail/reconciliation-detail.component';
import { CategoriesService } from '../../services/financial/categories.service';
import { BankingIntegrationService } from '../../services/financial/banking-integration.service';
import { CostCentersService } from '../../services/financial/cost-centers.service';
import { SearchableSelectionModalComponent } from '../../shared/components/searchable-selection-modal/searchable-selection-modal.component';
import { ClientsService } from '../../services/clients/clients';
import { SuppliersService } from '../../services/suppliers/suppliers.service';
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
        IonCheckbox, IonAccordion, IonAccordionGroup,
        ReconciliationDetailComponent,
        SearchableSelectionModalComponent
    ]
})
export class ReconciliationPage implements OnInit, OnDestroy {
    bankAccounts: BankAccount[] = [];
    selectedAccountId: string = '';
    selectedAccount: BankAccount | null = null;

    statements: BankStatement[] = [];
    filteredStatements: BankStatement[] = [];
    selectedStatement: BankStatement | null = null;

    // Changed to Set for multiple expansion
    expandedStatementIds: Set<string> = new Set();

    selectedStatementIds: Set<string> = new Set();
    suggestions: SuggestedMatch[] = [];

    // Filter and View State
    filterStatus: 'PENDING' | 'CONCILIATED' | 'ALL' = 'PENDING';
    filterType: 'ALL' | 'CREDIT' | 'DEBIT' = 'ALL';
    viewMode: 'PENDING' | 'MOVEMENTS' = 'PENDING';
    searchTerm: string = '';

    // Category Filter
    categories: any[] = [];
    selectedCategoryId: string = '';

    // Auxiliary caches to share with detail components
    costCenters: any[] = [];
    suppliers: any[] = [];
    clients: any[] = [];

    // Period State
    currentDate: Date = new Date();

    // Summary Stats
    summary = {
        totalCount: 0,
        receivablesCount: 0,
        payablesCount: 0,
        totalPendingValue: 0,
        totalConciliatedValue: 0,
        totalPeriodValue: 0
    };

    illustrationLoaded = true;
    loading = false;
    loadError: string | null = null;
    page = 1;
    pageSize = 50;
    totalItems = 0;
    totalPages = 1;
    private searchSubject = new Subject<string>();
    private searchSub?: Subscription;

    constructor(
        private route: ActivatedRoute,
        private reconciliationService: ReconciliationService,
        private financialService: FinancialService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private alertCtrl: AlertController,
        private modalCtrl: ModalController,
        private categoriesService: CategoriesService,
        private bankingIntegrationService: BankingIntegrationService,
        private costCentersService: CostCentersService,
        private suppliersService: SuppliersService,
        private clientsService: ClientsService
    ) {
        addIcons({
            receiptOutline, syncOutline, checkmarkCircleOutline, alertCircleOutline,
            linkOutline, addOutline, arrowForwardOutline, searchOutline, filterOutline,
            closeCircleOutline, informationCircleOutline, chevronDown, optionsOutline,
            cloudUploadOutline, chevronBackOutline, chevronForwardOutline,
            calendarOutline, cashOutline, walletOutline, arrowUpOutline, arrowDownOutline,
            trashBinOutline, createOutline, ellipsisVerticalOutline, closeOutline,
            funnelOutline, businessOutline, checkmarkCircle, helpCircleOutline,
            chevronUpOutline, chevronDownOutline, layersOutline, alertCircle, trashOutline
        });
    }

    ngOnInit() {
        this.searchSub = this.searchSubject
            .pipe(debounceTime(400), distinctUntilChanged())
            .subscribe((term) => {
                this.searchTerm = term;
                this.page = 1;
                this.loadStatements();
            });

        this.loadCategories();
        this.loadCostCenters();
        this.loadSuppliers();
        this.loadClients();
        this.route.queryParams.subscribe(params => {
            const accId = params['accountId'];
            this.loadAccounts(accId);
        });
    }

    ngOnDestroy(): void {
        this.searchSub?.unsubscribe();
    }

    loadCategories() {
        this.categoriesService.findAll().subscribe((cats: any[]) => this.categories = cats);
    }



    loadSuppliers() {
        this.suppliersService.findAll().subscribe((sups: any[]) => this.suppliers = sups);
    }

    loadClients() {
        this.clientsService.findAll().subscribe((cls: any[]) => this.clients = cls);
    }

    setViewMode(mode: 'PENDING' | 'MOVEMENTS') {
        this.viewMode = mode;
        this.filterStatus = (mode === 'PENDING') ? 'PENDING' : 'ALL';
        this.page = 1;
        this.loadStatements();
    }

    loadAccounts(targetId?: string) {
        this.financialService.getBankAccounts().subscribe({
            next: (accounts) => {
                this.bankAccounts = accounts;
                if (accounts.length > 0) {
                    const connectedAccount = accounts.find(a => a.integracao?.status === 'CONNECTED');
                    this.selectedAccountId = targetId || connectedAccount?.id || accounts[0].id;
                    this.loadStatements();
                }
            }
        });
    }

    loadStatements(event?: any) {
        if (!this.selectedAccountId) return;
        this.loading = true;
        this.loadError = null;

        this.selectedAccount = this.bankAccounts.find(a => a.id === this.selectedAccountId) || null;

        const filters: any = {
            startDate: this.filterStatus === 'PENDING' ? undefined : format(startOfMonth(this.currentDate), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(this.currentDate), 'yyyy-MM-dd'),
            status: this.filterStatus === 'ALL' ? undefined : this.filterStatus,
            categoryId: this.selectedCategoryId || undefined,
            page: this.page,
            pageSize: this.pageSize
        };

        if (this.searchTerm.trim()) {
            filters.search = this.searchTerm.trim();
        }

        this.reconciliationService.getStatements(this.selectedAccountId, filters).subscribe({
            next: (response) => {
                this.statements = response.data || [];
                this.totalItems = response.pagination?.total || 0;
                this.totalPages = response.pagination?.totalPages || 1;
                this.page = response.pagination?.page || this.page;
                
                // Use the backend's aggregate sum which ignores pagination limits
                this.summary.totalPendingValue = response.summary?.totalPendingValue || 0;
                this.summary.totalConciliatedValue = response.summary?.totalConciliatedValue || 0;
                this.summary.totalPeriodValue = response.summary?.totalPeriodValue || 0;

                this.calculateSummary();
                this.applySearch(); // Apply type filter
                this.collapseAll(); // DO NOT expand all by default for large datasets (3,000+ rows) to avoid massive rendering freeze
                this.loading = false;
                if (event) event.target.complete();
                setTimeout(() => this.restoreScroll(), 100);
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
                this.loadError = "Não foi possível carregar as conciliações. Tente novamente.";
                if (event) event.target.complete();
            }
        });
    }

    calculateSummary() {
        this.summary.totalCount = this.totalItems;
        this.summary.receivablesCount = this.statements.filter(s => s.tipo === 'CREDIT').length;
        this.summary.payablesCount = this.statements.filter(s => s.tipo === 'DEBIT').length;
        // totalPendingValue is now set directly from the backend response in loadStatements
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
        this.filteredStatements = filtered;
    }

    onSearch(event: any) {
        const term = (event?.target?.value || '').toString();
        this.searchSubject.next(term);
    }

    clearFilters() {
        this.searchTerm = '';
        this.selectedCategoryId = '';
        this.filterType = 'ALL';
        this.page = 1;
        this.loadStatements();
        this.showToast('Filtros limpos com sucesso.', 'medium');
    }

    nextMonth() {
        this.currentDate = addMonths(this.currentDate, 1);
        this.page = 1;
        this.loadStatements();
    }

    prevMonth() {
        this.currentDate = subMonths(this.currentDate, 1);
        this.page = 1;
        this.loadStatements();
    }

    goToPreviousPage() {
        if (this.page <= 1) return;
        this.page -= 1;
        this.loadStatements();
    }

    goToNextPage() {
        if (this.page >= this.totalPages) return;
        this.page += 1;
        this.loadStatements();
    }

    getPeriodLabel() {
        const label = format(this.currentDate, "MMMM 'de' yyyy", { locale: ptBR });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    toggleExpand(statement: BankStatement) {
        if (this.expandedStatementIds.has(statement.id)) {
            this.expandedStatementIds.delete(statement.id);
        } else {
            this.expandedStatementIds.add(statement.id);
        }
    }

    isExpanded(id: string): boolean {
        return this.expandedStatementIds.has(id);
    }

    toggleSelection(statement: BankStatement, event?: any) {
        if (event) event.stopPropagation();
        if (this.selectedStatementIds.has(statement.id)) {
            this.selectedStatementIds.delete(statement.id);
        } else {
            this.selectedStatementIds.add(statement.id);
        }
    }

    trackByFn(index: number, item: any) {
        return item.id;
    }

    isSelected(id: string) {
        return this.selectedStatementIds.has(id);
    }



    isAllSelected(): boolean {
        return this.filteredStatements.length > 0 && this.filteredStatements.every(s => this.selectedStatementIds.has(s.id));
    }

    toggleSelectAll() {
        if (this.isAllSelected()) {
            this.selectedStatementIds.clear();
        } else {
            this.filteredStatements.forEach(s => this.selectedStatementIds.add(s.id));
        }
    }

    selectSimilar(statement: BankStatement) {
        const desc = statement.descricao;
        let count = 0;
        this.filteredStatements.forEach(s => {
            if (s.descricao === desc) {
                this.selectedStatementIds.add(s.id);
                count++;
            }
        });
        this.showToast(`${count} itens com descrição similar selecionados.`);
    }

    async onDetailAction(event: any) {
        await this.saveScroll();
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
            next: async (res: any) => {
                loader.dismiss();
                this.loadStatements();

                if (res.suggestions?.length > 0) {
                    const count = res.suggestions.length;
                    const alert = await this.alertCtrl.create({
                        header: 'Sugestões de Conciliação',
                        message: `${res.imported} novos itens importados. Encontramos ${count} extrato(s) que podem ser conciliados com lançamentos existentes. Revise os itens pendentes.`,
                        buttons: [{ text: 'Ok', role: 'confirm' }]
                    });
                    await alert.present();
                } else {
                    this.showToast(`${res.imported} novos itens importados`);
                }
            },
            error: (err) => {
                loader.dismiss();
                const msg = err.error?.message || err.message || 'Erro na sincronização';
                this.showToast(msg, 'danger');
            }
        });
    }



    @ViewChild('ofxInput') ofxInput: any;
    @ViewChild('csvInput') csvInput: any;

    triggerOfxUpload() {
        if (!this.selectedAccountId) {
            this.showToast('Selecione uma conta bancária primeiro.', 'warning');
            return;
        }
        this.ofxInput.nativeElement.click();
    }

    triggerCsvUpload() {
        if (!this.selectedAccountId) {
            this.showToast('Selecione uma conta bancária primeiro.', 'warning');
            return;
        }
        this.csvInput.nativeElement.click();
    }

    async onOfxFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        const loader = await this.loadingCtrl.create({ message: 'Processando arquivo OFX...' });
        await loader.present();

        this.bankingIntegrationService.uploadOfx(file, this.selectedAccountId).subscribe({
            next: (res) => {
                loader.dismiss();
                this.showToast(res.message || 'Importação OFX concluída!');
                this.loadStatements();
                // Clear input
                event.target.value = null;
            },
            error: (err) => {
                loader.dismiss();
                console.error(err);
                this.showToast('Erro ao importar OFX.', 'danger');
                event.target.value = null;
            }
        });
    }

    async onCsvFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        const loader = await this.loadingCtrl.create({ message: 'Processando arquivo CSV...' });
        await loader.present();

        this.bankingIntegrationService.uploadCsv(file, this.selectedAccountId).subscribe({
            next: (res) => {
                loader.dismiss();
                this.showToast(res.message || 'Importação CSV concluída!');
                this.loadStatements();
                // Clear input
                event.target.value = null;
            },
            error: (err) => {
                loader.dismiss();
                console.error(err);
                const errorMsg = err.error?.message || 'Erro ao importar CSV.';
                this.showToast(errorMsg, 'danger');
                event.target.value = null;
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

    getPaymentMethod(descricao: string): { label: string, colorClass: string } | null {
        const desc = (descricao || '').toLowerCase();
        if (desc.includes('pix')) {
            return { label: 'Pix', colorClass: 'pix' };
        }
        if (desc.includes('cartao') || desc.includes('cartão') || desc.includes('credito') || desc.includes('crédito')) {
            return { label: 'Cartão', colorClass: 'cartao' };
        }
        if (desc.includes('debito') || desc.includes('débito') || desc.includes('tar') || desc.includes('tarifa')) {
            return { label: 'Débito', colorClass: 'debito' };
        }
        if (desc.includes('ted') || desc.includes('doc')) {
            return { label: 'Transferência', colorClass: 'transferencia' };
        }
        if (desc.includes('boleto')) {
            return { label: 'Boleto', colorClass: 'boleto' };
        }
        return null;
    }

    // --- UI/UX Enhancements ---

    expandAll() {
        this.expandedStatementIds = new Set(this.statements.map(s => s.id));
    }

    collapseAll() {
        this.expandedStatementIds.clear();
    }

    areAllExpanded(): boolean {
        return this.statements.length > 0 && this.expandedStatementIds.size === this.statements.length;
    }

    toggleExpandAll() {
        if (this.areAllExpanded()) {
            this.collapseAll();
        } else {
            this.expandAll();
        }
    }

    @ViewChild(IonContent) content!: IonContent;
    private lastScrollTop = 0;

    async saveScroll() {
        const scroll = await this.content.getScrollElement();
        this.lastScrollTop = scroll.scrollTop;
    }

    async restoreScroll() {
        if (this.lastScrollTop > 0) {
            // Wait for DOM to render new list
            setTimeout(() => {
                this.content.scrollToPoint(0, this.lastScrollTop, 500);
            }, 300);
        }
    }

    // --- Bulk Actions ---

    async reconcileSelected() {
        if (this.selectedStatementIds.size === 0) return;

        // 1. Prompt for Category
        const modal = await this.modalCtrl.create({
            component: SearchableSelectionModalComponent,
            componentProps: {
                title: 'Definir Categoria em Massa',
                items: this.categories.map(c => ({ id: c.id, label: c.nome })),
                enableCreate: true,
                createLabel: 'Nova Categoria'
            },
            cssClass: 'centered-selection-modal'
        });

        await modal.present();
        const { data } = await modal.onDidDismiss();

        if (data) {
            let categoryId = data.id;
            if (data.id === '_NEW_') {
                // Quick create for bulk?
                // For now, simple error or handle it.
                // Let's reuse quick create logic but we need to wait for it.
                // This complexity suggests avoiding Quick Create in Bulk for this iteration or handling it.
                // I'll skip Quick Create in bulk for simplicity or implement it if critical.
                // User asked "Select category", implying existing.
                // But Searchable has "Create" button.
                this.showToast('Criação rápida não suportada em massa neste momento. Selecione uma existente.', 'warning');
                return;
            }

            const confirmed = await this.requestManualConfirmationBulk();
            if (!confirmed) return;

            this.applyBulkReconciliation(categoryId);
        }
    }


    private async requestManualConfirmationBulk(): Promise<boolean> {
        const alert = await this.alertCtrl.create({
            header: 'Confirmação manual obrigatória',
            message: `Você está prestes a conciliar manualmente ${this.selectedStatementIds.size} lançamento(s). Deseja continuar?`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                { text: 'Confirmar', role: 'confirm' }
            ]
        });

        await alert.present();
        const { role } = await alert.onDidDismiss();
        return role === 'confirm';
    }

    async applyBulkReconciliation(categoryId: string) {
        const loader = await this.loadingCtrl.create({ message: 'Processando em massa...' });
        await loader.present();

        try {
            const ids = Array.from(this.selectedStatementIds);
            // We need a backend endpoint for bulk, or loop.
            // Looping is easier for now given existing service.
            // "reconciliationService.createAndLink" expects payload.

            // We need to know if we are linking or creating. User said "Conciliar" -> Create new Lancamento usually.

            const promises = ids.map(id => {
                const stmt = this.statements.find(s => s.id === id);
                if (!stmt) return Promise.resolve();

                // Construct payload
                const payload = {
                    descricao: stmt.descricao,
                    valor: Math.abs(Number(stmt.valor)),
                    tipo: stmt.tipo, // Backend converts CREDIT/DEBIT
                    dataVencimento: stmt.data,
                    dataCompetencia: stmt.data,
                    categoriaId: categoryId,
                    // Default Cost Center "Geral"
                    centroCustoId: this.getGeralCostCenterId()
                };
                return this.reconciliationService.createAndLink(id, payload, true).toPromise();
            });

            await Promise.all(promises);
            this.showToast('Lançamentos conciliados com sucesso!');
            this.selectedStatementIds.clear();
            this.saveScroll(); // Save before reload
            this.loadStatements();
        } catch (e) {
            console.error(e);
            this.showToast('Erro ao conciliar alguns itens.', 'danger');
        } finally {
            loader.dismiss();
        }
    }

    // Helper to find Geral (assuming loaded or we fetch)
    // We don't have cost centers loaded in page, only in component.
    // I should load them or just send null if "Geral" logic is in backend?
    // User requirement: "Colocar por padrão centro de custo como Geral".
    // I implemented this in `reconciliation-detail.component.ts`.
    // I should add `costCenters` to this page or let backend handle default?
    // I will let backend handle default if null, or fetch here.
    // Ideally fetch.

    geralCostCenterId: string | undefined;

    loadCostCenters() {
        this.costCentersService.findAll().subscribe(ccs => {
            this.costCenters = ccs;
            const geral = ccs.find(c => c.nome.toLowerCase() === 'geral');
            if (geral) {
                this.geralCostCenterId = geral.id;
            }
        });
    }

    getGeralCostCenterId(): string | undefined {
        return this.geralCostCenterId;
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

    async zeroPendingMonth() {
        if (!this.selectedAccountId) return;
        const periodLabel = this.getPeriodLabel();
        const alert = await this.alertCtrl.create({
            header: 'Zerar Pendências',
            message: `Tem certeza que deseja marcar como conciliados todos os lançamentos ainda pendentes do mês de <b>${periodLabel}</b>?<br><br>Esta ação não criará lançamentos financeiros, apenas limpará as pendências do período.`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Confirmar e Zerar',
                    role: 'confirm',
                    handler: () => {
                        this.executeZeroPending();
                    }
                }
            ]
        });
        await alert.present();
    }

    async executeZeroPending() {
        const loader = await this.loadingCtrl.create({ message: 'Limpando pendências...' });
        await loader.present();

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1; // getMonth is 0-indexed

        this.reconciliationService.zeroPending(this.selectedAccountId, year, month).subscribe({
            next: (res) => {
                loader.dismiss();
                this.showToast(`Sucesso! ${res.count} lançamentos pendentes foram zerados.`, 'success');
                this.loadStatements();
            },
            error: (err) => {
                loader.dismiss();
                console.error(err);
                const msg = err.error?.message || 'Erro ao zerar pendências do período.';
                this.showToast(msg, 'danger');
            }
        });
    }

    cleanDescription(desc: string): string {
        if (!desc) return '';
        let cleaned = desc;

        // Limpa trechos padronizados
        if (cleaned.includes('No estabelecimento ')) {
            const parts = cleaned.split('No estabelecimento ');
            return parts[parts.length - 1].trim();
        }

        // Pega nomes após 'Cp :12345678-NOME' ou variações (incluindo travessão e espaços)
        const cpMatch = cleaned.match(/Cp\s*:\s*(.*?)[-–—]\s*(.*)/i);
        if (cpMatch && cpMatch[2]) {
            return cpMatch[2].trim();
        }

        // Caso geral com traços: pega a última parte
        if (cleaned.includes(' - ')) {
            const parts = cleaned.split(' - ');
            return parts[parts.length - 1].trim();
        }

        return cleaned.trim();
    }
}
