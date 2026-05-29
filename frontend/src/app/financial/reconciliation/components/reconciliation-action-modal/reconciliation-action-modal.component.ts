import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonIcon, IonList, IonItem, IonLabel, IonNote, IonSpinner, ModalController, AlertController,
    IonSearchbar, IonChip, IonFooter, IonSegment, IonSegmentButton,
    IonInput, IonSelect, IonSelectOption, IonRow, IonCol, IonGrid,
    IonDatetime, IonDatetimeButton, IonModal, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    closeOutline, checkmarkCircleOutline, searchOutline, addOutline,
    linkOutline, warningOutline, calendarOutline, cashOutline,
    swapHorizontalOutline, documentTextOutline, chevronDownOutline,
    businessOutline, cloudUploadOutline, trashOutline, constructOutline
} from 'ionicons/icons';
import { BankStatement, SuggestedMatch } from '../../../../services/financial/reconciliation';
import { ReconciliationService } from '../../../../services/financial/reconciliation.service';
import { CategoriesService, Category } from '../../../../services/financial/categories.service';
import { SuppliersService, Supplier } from '../../../../services/suppliers/suppliers.service';
import { CostCentersService, CostCenter } from '../../../../services/financial/cost-centers.service';
import { FinancialService, BankAccount } from '../../../../services/financial/financial';
import { ObrasService, Obra } from '../../../../services/financial/obras.service';
import { format, parseISO } from 'date-fns';

@Component({
    selector: 'app-reconciliation-action-modal',
    templateUrl: './reconciliation-action-modal.component.html',
    styleUrls: ['./reconciliation-action-modal.component.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
        IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, IonSpinner,
        IonSearchbar, IonChip, IonFooter, IonSegment, IonSegmentButton,
        IonInput, IonSelect, IonSelectOption, IonRow, IonCol, IonGrid,
        IonDatetime, IonDatetimeButton, IonModal
    ]
})
export class ReconciliationActionModalComponent implements OnInit {
    @Input() statement!: BankStatement;

    activeTab: 'NEW' | 'TRANSFER' = 'NEW';
    mode: 'FORM' | 'SEARCH' = 'FORM';

    categories: Category[] = [];
    suppliers: Supplier[] = [];
    costCenters: CostCenter[] = [];
    suggestions: SuggestedMatch[] = [];
    bankAccounts: BankAccount[] = [];
    obras: Obra[] = [];

    items: Array<{ descricao: string; quantidade: number; valorUnitario: number; valorUnitarioStr?: string }> = [];

    form = {
        descricao: '',
        categoriaId: '',
        fornecedorId: '',
        centroCustoId: '',
        valor: 0,
        dataVencimento: '',
        dataCompetencia: '',
        contaDestinoId: '',
        classificacao: 'ADMINISTRATIVO', // 'ADMINISTRATIVO' or 'OBRAS'
        obraId: ''
    };

    loadingSuggestions = true;
    loadingAction = false;
    loadingAux = true;

    constructor(
        private modalCtrl: ModalController,
        private reconciliationService: ReconciliationService,
        private categoriesService: CategoriesService,
        private suppliersService: SuppliersService,
        private costCentersService: CostCentersService,
        private financialService: FinancialService,
        private obrasService: ObrasService,
        private toastCtrl: ToastController,
        private alertCtrl: AlertController
    ) {
        addIcons({
            closeOutline, checkmarkCircleOutline, searchOutline, addOutline,
            linkOutline, warningOutline, calendarOutline, cashOutline,
            swapHorizontalOutline, documentTextOutline, chevronDownOutline,
            businessOutline, cloudUploadOutline, trashOutline, constructOutline
        });
    }

    ngOnInit() {
        this.initForm();
        this.loadAuxData();
        this.loadSuggestions();
    }

    initForm() {
        this.form.descricao = this.statement.descricao;
        this.form.valor = Math.abs(this.statement.valor);
        this.form.dataVencimento = this.statement.data;
        this.form.dataCompetencia = this.statement.data;
    }

    loadAuxData() {
        this.loadingAux = true;
        const targetType = this.statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';

        this.categoriesService.findAll().subscribe(cats => {
            this.categories = cats.filter(c => c.tipo === targetType);
        });

        this.suppliersService.findAll().subscribe(sups => {
            this.suppliers = sups;
        });

        this.costCentersService.findAll().subscribe(ccs => {
            this.costCenters = ccs;
            this.loadBankAccounts();
        });

        this.obrasService.getAll().subscribe({
            next: (obras) => {
                this.obras = obras.filter(o => o.ativo !== false);
            }
        });
    }

    loadBankAccounts() {
        this.financialService.getBankAccounts().subscribe({
            next: (accounts) => {
                const originAccountId = this.statement.importacao?.contaBancariaId;
                this.bankAccounts = originAccountId
                    ? accounts.filter(acc => acc.id !== originAccountId)
                    : accounts;
                this.loadingAux = false;
            },
            error: () => {
                this.loadingAux = false;
            }
        });
    }

    loadSuggestions() {
        this.loadingSuggestions = true;
        this.reconciliationService.getSuggestedMatches(this.statement.id).subscribe({
            next: (data) => {
                this.suggestions = data;
                this.loadingSuggestions = false;
                const bestMatch = data.find(s => (s.confidence || 0) > 90);
                if (bestMatch) this.mode = 'SEARCH';
            },
            error: (err) => {
                console.error(err);
                this.loadingSuggestions = false;
            }
        });
    }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    formatDate(dateStr: string) {
        return format(parseISO(dateStr), 'dd/MM/yyyy');
    }

    toggleMode() {
        this.mode = this.mode === 'FORM' ? 'SEARCH' : 'FORM';
    }

    addItem() {
        this.items.push({ descricao: '', quantidade: 1, valorUnitario: 0, valorUnitarioStr: '' });
    }

    removeItem(index: number) {
        this.items.splice(index, 1);
    }

    get itemsTotal() {
        return this.items.reduce((sum, item) => sum + (Number(item.quantidade || 0) * Number(item.valorUnitario || 0)), 0);
    }

    get isTotalMatching() {
        if (this.items.length === 0) return true;
        return Math.abs(this.itemsTotal - this.form.valor) < 0.05;
    }

    async confirmCreation() {
        if (this.activeTab === 'TRANSFER') {
            if (!this.form.contaDestinoId || !this.form.dataCompetencia) return;
        } else if (!this.form.descricao || !this.form.categoriaId || !this.form.dataCompetencia) {
            return;
        }

        // Validate items sum
        if (this.items.length > 0 && !this.isTotalMatching) {
            this.showToast(`A soma dos itens (${this.formatCurrency(this.itemsTotal)}) deve ser igual ao valor do extrato (${this.formatCurrency(this.form.valor)})!`, 'warning');
            return;
        }

        const confirmed = await this.requestManualConfirmation('Confirmar conciliação', 'Deseja confirmar manualmente esta conciliação?');
        if (!confirmed) return;

        this.loadingAction = true;

        // Generate observacoes from items
        let compiledObservacoes = '';
        if (this.items.length > 0) {
            compiledObservacoes = `Detalhamento de Itens:\n` + this.items.map((item, idx) => `${idx + 1}. ${item.descricao} - Qtd: ${item.quantidade} x R$ ${item.valorUnitario.toFixed(2)} (Subtotal: R$ ${(item.quantidade * item.valorUnitario).toFixed(2)})`).join('\n');
        }

        const payload = {
            descricao: this.form.descricao,
            categoriaId: this.form.categoriaId,
            fornecedorId: this.form.fornecedorId,
            centroCustoId: this.form.centroCustoId,
            valor: this.form.valor,
            dataVencimento: this.form.dataVencimento,
            dataCompetencia: this.form.dataCompetencia,
            contaDestinoId: this.form.contaDestinoId,
            isTransfer: this.activeTab === 'TRANSFER',
            tipo: this.statement.tipo,
            obraId: this.form.classificacao === 'OBRAS' ? this.form.obraId : null,
            observacoes: compiledObservacoes || null
        };

        this.reconciliationService.createAndLink(this.statement.id, payload, true).subscribe({
            next: () => {
                this.loadingAction = false;
                this.modalCtrl.dismiss({ action: 'created' });
            },
            error: (err) => {
                console.error(err);
                this.loadingAction = false;
            }
        });
    }

    async showToast(message: string, color: string = 'success') {
        const toast = await this.toastCtrl.create({
            message,
            duration: 2500,
            color,
            position: 'top'
        });
        await toast.present();
    }

    formatCurrency(val: number) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }

    async link(match: SuggestedMatch) {
        const confirmed = await this.requestManualConfirmation('Confirmar vínculo', 'Deseja confirmar manualmente este vínculo de conciliação?');
        if (!confirmed) return;

        this.loadingAction = true;
        this.reconciliationService.linkManual(this.statement.id, match.id, true).subscribe({
            next: () => {
                this.loadingAction = false;
                this.modalCtrl.dismiss({ action: 'linked' });
            },
            error: (err) => {
                console.error(err);
                this.loadingAction = false;
            }
        });
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

    formatValorUnitario(value: number | undefined | null): string {
        if (value === undefined || value === null || value === 0) return '';
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    onValorUnitarioInput(event: any, item: any) {
        const val = event.target.value;
        item.valorUnitarioStr = val;
        
        if (!val) {
            item.valorUnitario = 0;
            return;
        }

        let cleaned = val.replace(/\s/g, '').replace('R$', '');
        const hasComma = cleaned.includes(',');
        const hasDot = cleaned.includes('.');

        if (hasComma && hasDot) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (hasComma) {
            cleaned = cleaned.replace(',', '.');
        }

        const parsed = parseFloat(cleaned);
        item.valorUnitario = isNaN(parsed) ? 0 : parsed;
    }

    onValorUnitarioBlur(event: any, item: any) {
        item.valorUnitarioStr = this.formatValorUnitario(item.valorUnitario);
        event.target.value = item.valorUnitarioStr;
    }

    onValorUnitarioFocus(event: any, item: any) {
        if (item.valorUnitario > 0) {
            item.valorUnitarioStr = item.valorUnitario.toString().replace('.', ',');
            event.target.value = item.valorUnitarioStr;
        }
    }
}
