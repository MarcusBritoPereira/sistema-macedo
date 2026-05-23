import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonButton, IonIcon, IonSpinner, IonSearchbar, IonChip,
    IonInput, IonSelect, IonSelectOption, IonDatetime, IonModal, IonContent, IonDatetimeButton,
    ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    closeOutline, checkmarkCircleOutline, searchOutline, addOutline,
    linkOutline, warningOutline, calendarOutline, cashOutline,
    swapHorizontalOutline, locationOutline, businessOutline, cloudUploadOutline,
    chevronDownOutline, trashOutline
} from 'ionicons/icons';
import { BankStatement, SuggestedMatch } from '../../../../services/financial/reconciliation';
import { ReconciliationService } from '../../../../services/financial/reconciliation.service';
import { CategoriesService, Category } from '../../../../services/financial/categories.service';
import { ClientsService, Cliente } from '../../../../services/clients/clients';
import { SuppliersService, Supplier } from '../../../../services/suppliers/suppliers.service';
import { CostCentersService, CostCenter } from '../../../../services/financial/cost-centers.service';
import { ObrasService, Obra } from '../../../../services/financial/obras.service';
import { QuickCreateModalComponent, EntityType } from '../../../../shared/components/quick-create-modal/quick-create-modal.component';
import { SearchableSelectionModalComponent, SelectionItem } from '../../../../shared/components/searchable-selection-modal/searchable-selection-modal.component';

@Component({
    selector: 'app-reconciliation-detail',
    templateUrl: './reconciliation-detail.component.html',
    styleUrls: ['./reconciliation-detail.component.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        IonButton, IonIcon, IonSpinner, IonSearchbar, IonChip,
        IonInput, IonSelect, IonSelectOption, IonDatetime, IonModal, IonContent, IonDatetimeButton,
        QuickCreateModalComponent
    ]
})
export class ReconciliationDetailComponent implements OnInit {
    @Input() statement!: BankStatement;
    @Input() suggestions: SuggestedMatch[] = [];
    @Output() close = new EventEmitter<void>();
    @Output() complete = new EventEmitter<void>();

    @Input() categories: Category[] = [];
    @Input() suppliers: Supplier[] = [];
    @Input() clients: Cliente[] = [];
    @Input() costCenters: CostCenter[] = [];

    obras: Obra[] = [];

    loadingAux = false;
    loadingAction = false;
    loadingSuggestions = false;

    // UI State
    activeTab: 'NEW' | 'TRANSFER' = 'NEW';
    mode: 'FORM' | 'SEARCH' = 'FORM';

    // Form for new transaction
    form: any = {
        descricao: '',
        valor: 0,
        dataVencimento: '',
        dataCompetencia: '',
        categoriaId: '',
        fornecedorId: '', // Used for both supplier and client ID
        centroCustoId: '',
        classificacao: '',
        tipoLancamento: 'ADMINISTRATIVO',
        obraId: '',
        items: []
    };

    constructor(
        private reconciliationService: ReconciliationService,
        private categoriesService: CategoriesService,
        private suppliersService: SuppliersService,
        private clientsService: ClientsService,
        private costCentersService: CostCentersService,
        private obrasService: ObrasService,
        private toastCtrl: ToastController,
        private modalCtrl: ModalController,
        private alertCtrl: AlertController
    ) {
        addIcons({
            closeOutline, checkmarkCircleOutline, searchOutline, addOutline,
            linkOutline, warningOutline, calendarOutline, cashOutline,
            swapHorizontalOutline, locationOutline, businessOutline, cloudUploadOutline,
            chevronDownOutline, trashOutline
        });
    }

    @ViewChild('searchBar') searchBar!: IonSearchbar;

    ngOnInit() {
        if (this.statement) {
            this.form.descricao = this.statement.descricao;
            this.form.valor = Math.abs(Number(this.statement.valor));
            this.form.dataVencimento = this.statement.data;
            this.form.dataCompetencia = this.statement.data; // Default to statement date

            this.form.classificacao = this.statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';
            this.form.tipoLancamento = 'ADMINISTRATIVO';
            this.form.obraId = '';
            this.form.items = [];

            if (this.statement.tipo === 'CREDIT' && this.statement.suggestedEntity?.cliente?.id) {
                this.form.fornecedorId = this.statement.suggestedEntity.cliente.id;
            }
            if (this.statement.tipo === 'DEBIT' && this.statement.suggestedEntity?.fornecedor?.id) {
                this.form.fornecedorId = this.statement.suggestedEntity.fornecedor.id;
            }

            this.loadAuxData();

            // Load active obras
            this.obrasService.getAll().subscribe({
                next: (obras) => {
                    this.obras = obras || [];
                },
                error: (err) => console.error('Erro ao buscar obras:', err)
            });

            // Auto-switch to SEARCH if suggestions exist
            if (this.suggestions && this.suggestions.length > 0) {
                this.mode = 'SEARCH';
                setTimeout(() => this.searchBar?.setFocus(), 100);
            }
        }
    }

    toggleMode() {
        this.mode = this.mode === 'FORM' ? 'SEARCH' : 'FORM';
        if (this.mode === 'SEARCH') {
            setTimeout(() => {
                this.searchBar?.setFocus();
            }, 500);
        }
    }

    formatDate(dateStr: string | Date | undefined) {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR');
        } catch (e) {
            return '-';
        }
    }

    loadAuxData() {
        this.loadingAux = true;
        const targetType = this.statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';

        const processData = () => {
            // Filter local copy by type
            this.categories = this.categories.filter(c => c.tipo === targetType);

            // Default to "Geral" if not set
            if (!this.form.centroCustoId && this.costCenters.length > 0) {
                const geral = this.costCenters.find(c => c.nome.toLowerCase() === 'geral');
                if (geral) {
                    this.form.centroCustoId = geral.id;
                }
            }
            this.loadingAux = false;
        };

        // Fallback: If for some reason lists were not passed from parent, fetch them
        if (this.categories.length === 0 && this.costCenters.length === 0) {
            this.categoriesService.findAll().subscribe(cats => {
                this.categories = cats;
                if (targetType === 'DESPESA') {
                    this.suppliersService.findAll().subscribe(sups => {
                        this.suppliers = sups;
                        this.costCentersService.findAll().subscribe(ccs => {
                            this.costCenters = ccs;
                            processData();
                        });
                    });
                } else {
                    this.clientsService.findAll().subscribe(clients => {
                        this.clients = clients;
                        this.costCentersService.findAll().subscribe(ccs => {
                            this.costCenters = ccs;
                            processData();
                        });
                    });
                }
            });
        } else {
            processData();
        }
    }

    addItem() {
        this.form.items.push({
            descricao: '',
            quantidade: 1,
            valorUnitario: 0
        });
    }

    removeItem(index: number) {
        this.form.items.splice(index, 1);
    }

    getItemsTotal(): number {
        if (!this.form.items || this.form.items.length === 0) return 0;
        return this.form.items.reduce((sum: number, item: any) => sum + (Number(item.quantidade || 0) * Number(item.valorUnitario || 0)), 0);
    }

    isItemsTotalMatching(): boolean {
        if (!this.form.items || this.form.items.length === 0) return true;
        return Math.abs(this.getItemsTotal() - this.form.valor) < 0.01;
    }

    async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
        const toast = await this.toastCtrl.create({
            message,
            duration: 3000,
            position: 'bottom',
            color
        });
        await toast.present();
    }

    async confirmCreation() {
        if (!this.form.descricao) {
            return;
        }

        if (this.form.items && this.form.items.length > 0 && !this.isItemsTotalMatching()) {
            this.presentToast('O valor total dos itens deve corresponder exatamente ao valor do extrato.', 'warning');
            return;
        }

        const confirmed = await this.requestManualConfirmation('Confirmar conciliação', 'Deseja confirmar manualmente esta conciliação?');
        if (!confirmed) {
            return;
        }

        this.loadingAction = true;

        const entityId = this.form.fornecedorId;
        const isCredit = this.statement.tipo === 'CREDIT';

        let observacoes = '';
        if (this.form.items && this.form.items.length > 0) {
            observacoes = 'Itens Detalhados:\n' + this.form.items
                .map((it: any) => `- ${it.descricao || 'Item'}: ${it.quantidade} x ${it.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} = ${(it.quantidade * it.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
                .join('\n');
        }

        const payload = {
            descricao: this.form.descricao,
            categoriaId: this.form.categoriaId,
            fornecedorId: isCredit ? null : entityId,
            clienteId: isCredit ? entityId : null,
            centroCustoId: this.form.centroCustoId,
            valor: this.form.valor,
            dataVencimento: this.form.dataVencimento,
            dataCompetencia: this.form.dataCompetencia,
            tipo: this.form.classificacao, // Use the user selected classification
            obraId: this.form.tipoLancamento === 'OBRA' ? this.form.obraId : null,
            observacoes: observacoes || undefined
        };

        this.reconciliationService.createAndLink(this.statement.id, payload, true).subscribe({
            next: () => {
                this.loadingAction = false;
                this.complete.emit();
            },
            error: (err: any) => {
                console.error(err);
                this.loadingAction = false;
            }
        });
    }

    async link(match: SuggestedMatch) {
        const confirmed = await this.requestManualConfirmation('Confirmar vínculo', 'Deseja confirmar manualmente este vínculo de conciliação?');
        if (!confirmed) {
            return;
        }

        this.loadingAction = true;
        this.reconciliationService.linkManual(this.statement.id, match.id, true).subscribe({
            next: () => {
                this.loadingAction = false;
                this.complete.emit();
            },
            error: (err: any) => {
                console.error(err);
                this.loadingAction = false;
            }
        });
    }

    cancel() {
        this.close.emit();
    }



    private async requestManualConfirmation(header: string, message: string): Promise<boolean> {
        const alert = await this.alertCtrl.create({
            header,
            message,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                { text: 'Confirmar', role: 'confirm' }
            ]
        });

        await alert.present();
        const { role } = await alert.onDidDismiss();
        return role === 'confirm';
    }

    async unreconcile() {
        if (!this.statement.conciliacoes || this.statement.conciliacoes.length === 0) {
            return;
        }

        const reconciliationId = this.statement.conciliacoes[0].id; // Assuming one-to-one for simplicity usually

        this.loadingAction = true;
        this.reconciliationService.unlink(reconciliationId).subscribe({
            next: () => {
                this.loadingAction = false;
                this.complete.emit();
            },
            error: (err: any) => {
                console.error(err);
                this.loadingAction = false;
            }
        });
    }

    // --- Searchable Modal Logic ---

    async openSelection(type: 'CATEGORY' | 'ENTITY' | 'COST_CENTER') {
        let items: SelectionItem[] = [];
        let title = '';
        let createLabel = '';
        let selectedId = '';
        let enableCreate = true;

        if (type === 'CATEGORY') {
            title = 'Selecione a Categoria';
            createLabel = 'Nova Categoria';
            selectedId = this.form.categoriaId;
            items = this.categories.map(c => ({ id: c.id || '', label: c.nome }));
        } else if (type === 'ENTITY') {
            // Supplier or Client
            const isCredit = this.statement.tipo === 'CREDIT';
            title = isCredit ? 'Selecione o Cliente' : 'Selecione o Fornecedor';
            createLabel = isCredit ? 'Novo Cliente' : 'Novo Fornecedor';
            selectedId = this.form.fornecedorId;

            if (isCredit) {
                items = this.clients.map(c => ({ id: c.id || '', label: c.nomeFantasia || c.razaoSocial, subLabel: c.cnpj || c.cpf }));
            } else {
                items = this.suppliers.map(s => ({ id: s.id || '', label: s.nomeFantasia, subLabel: s.cnpj }));
            }
        } else if (type === 'COST_CENTER') {
            title = 'Selecione o Centro de Custo';
            createLabel = 'Novo Centro de Custo';
            selectedId = this.form.centroCustoId;
            items = this.costCenters.map(cc => ({ id: cc.id || '', label: cc.nome }));
        }

        const modal = await this.modalCtrl.create({
            component: SearchableSelectionModalComponent,
            componentProps: {
                title,
                items,
                selectedId,
                enableCreate,
                createLabel
            },
            cssClass: 'centered-selection-modal'
        });

        await modal.present();

        const { data } = await modal.onWillDismiss();

        if (data) {
            if (data.id === '_NEW_') {
                // Trigger quick create
                const qTypeMap: any = {
                    'CATEGORY': 'CATEGORY',
                    'ENTITY': this.statement.tipo === 'CREDIT' ? 'CLIENT' : 'SUPPLIER',
                    'COST_CENTER': 'COST_CENTER'
                };
                await this.openQuickCreate(qTypeMap[type]);
            } else {
                // Determine which field to set
                if (type === 'CATEGORY') this.form.categoriaId = data.id;
                if (type === 'ENTITY') this.form.fornecedorId = data.id;
                if (type === 'COST_CENTER') this.form.centroCustoId = data.id;
            }
        }
    }

    // --- Helpers for Display ---

    getCategoryName(): string {
        const c = this.categories.find(x => x.id === this.form.categoriaId);
        return c ? c.nome : '';
    }

    getEntityName(): string {
        const isCredit = this.statement.tipo === 'CREDIT';
        if (isCredit) {
            const c = this.clients.find(x => x.id === this.form.fornecedorId);
            return c ? (c.nomeFantasia || c.razaoSocial) : '';
        } else {
            const s = this.suppliers.find(x => x.id === this.form.fornecedorId);
            return s ? s.nomeFantasia : '';
        }
    }

    getCostCenterName(): string {
        const c = this.costCenters.find(x => x.id === this.form.centroCustoId);
        return c ? c.nome : '';
    }

    // --- Quick Create Logic (Existing) ---

    async openQuickCreate(type: EntityType) {
        const targetType = this.statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';

        const modal = await this.modalCtrl.create({
            component: QuickCreateModalComponent,
            componentProps: {
                entityType: type,
                parentContext: type === 'CATEGORY' ? targetType : undefined
            },
            cssClass: 'centered-selection-modal'
        });

        await modal.present();

        const { data } = await modal.onWillDismiss();

        if (data) {
            // New item created!
            if (type === 'CATEGORY') {
                this.categories.push(data);
                this.form.categoriaId = data.id;
            } else if (type === 'SUPPLIER') {
                this.suppliers.push(data);
                this.form.fornecedorId = data.id;
            } else if (type === 'CLIENT') {
                this.clients.push(data);
                this.form.fornecedorId = data.id;
            } else if (type === 'COST_CENTER') {
                this.costCenters.push(data);
                this.form.centroCustoId = data.id;
            }
        }
    }
}

