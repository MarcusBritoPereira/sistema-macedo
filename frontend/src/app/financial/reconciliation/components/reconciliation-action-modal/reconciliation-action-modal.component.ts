import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonIcon, IonList, IonItem, IonLabel, IonNote, IonSpinner, ModalController,
    IonSearchbar, IonChip, IonFooter, IonSegment, IonSegmentButton,
    IonInput, IonSelect, IonSelectOption, IonRow, IonCol, IonGrid
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    closeOutline, checkmarkCircleOutline, searchOutline, addOutline,
    linkOutline, warningOutline, calendarOutline, cashOutline,
    swapHorizontalOutline, documentTextOutline, chevronDownOutline,
    businessOutline, cloudUploadOutline
} from 'ionicons/icons';
import { BankStatement, SuggestedMatch } from '../../../../services/financial/reconciliation';
import { ReconciliationService } from '../../../../services/financial/reconciliation.service';
import { CategoriesService, Category } from '../../../../services/financial/categories.service';
import { SuppliersService, Supplier } from '../../../../services/suppliers/suppliers.service';
import { CostCentersService, CostCenter } from '../../../../services/financial/cost-centers.service';
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
        IonInput, IonSelect, IonSelectOption, IonRow, IonCol, IonGrid
    ]
})
export class ReconciliationActionModalComponent implements OnInit {
    @Input() statement!: BankStatement;

    // Navigation
    activeTab: 'NEW' | 'TRANSFER' = 'NEW';
    mode: 'FORM' | 'SEARCH' = 'FORM';

    // Data Lists
    categories: Category[] = [];
    suppliers: Supplier[] = [];
    costCenters: CostCenter[] = [];
    suggestions: SuggestedMatch[] = [];

    // Form Data
    form = {
        descricao: '',
        categoriaId: '',
        fornecedorId: '',
        centroCustoId: '',
        valor: 0,
        dataVencimento: ''
    };

    // State
    loadingSuggestions = true;
    loadingAction = false;
    loadingAux = true;

    constructor(
        private modalCtrl: ModalController,
        private reconciliationService: ReconciliationService,
        private categoriesService: CategoriesService,
        private suppliersService: SuppliersService,
        private costCentersService: CostCentersService
    ) {
        addIcons({
            closeOutline, checkmarkCircleOutline, searchOutline, addOutline,
            linkOutline, warningOutline, calendarOutline, cashOutline,
            swapHorizontalOutline, documentTextOutline, chevronDownOutline,
            businessOutline, cloudUploadOutline
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
    }

    loadAuxData() {
        this.loadingAux = true;
        const targetType = this.statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';

        // Load all in parallel
        // Ideally use forkJoin but simple subscription is fine for now
        this.categoriesService.findAll().subscribe(cats => {
            this.categories = cats.filter(c => c.tipo === targetType);
        });

        this.suppliersService.findAll().subscribe(sups => {
            this.suppliers = sups;
        });

        this.costCentersService.findAll().subscribe(ccs => {
            this.costCenters = ccs;
            this.loadingAux = false;
        });
    }

    loadSuggestions() {
        this.loadingSuggestions = true;
        this.reconciliationService.getSuggestedMatches(this.statement.id).subscribe({
            next: (data) => {
                this.suggestions = data;
                this.loadingSuggestions = false;

                // If high match, switch to search mode automatically to show it?
                // For now keep FORM as default as per Conta Azul style usually defaults to form
                // unless a very high match is found.
                const bestMatch = data.find(s => (s.confidence || 0) > 90);
                if (bestMatch) {
                    this.mode = 'SEARCH';
                }
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

    // Action: Create New Transaction and Link
    async confirmCreation() {
        if (!this.form.descricao || !this.form.categoriaId) {
            // Simple validation
            return;
        }

        this.loadingAction = true;
        // Map form to payload (matches createAndLink DTO)
        const payload = {
            descricao: this.form.descricao,
            categoriaId: this.form.categoriaId,
            fornecedorId: this.form.fornecedorId,
            centroCustoId: this.form.centroCustoId,
            valor: this.form.valor,
            dataVencimento: this.form.dataVencimento,
            tipo: this.statement.tipo // Add type
        };

        this.reconciliationService.createAndLink(this.statement.id, payload).subscribe({
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

    // Action: Link to Existing (from suggestions/search)
    async link(match: SuggestedMatch) {
        this.loadingAction = true;
        this.reconciliationService.linkManual(this.statement.id, match.id).subscribe({
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
}
