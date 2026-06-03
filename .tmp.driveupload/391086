import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea,
    IonDatetime, IonDatetimeButton, IonModal, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, calendarOutline, cashOutline } from 'ionicons/icons';
import { FinancialService, Transaction } from '../../../services/financial/financial';
import { CategoriesService } from '../../../services/financial/categories.service';
import { CostCentersService } from '../../../services/financial/cost-centers.service';

@Component({
    selector: 'app-transaction-modal',
    templateUrl: './transaction-modal.component.html',
    styleUrls: ['./transaction-modal.component.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent,
        IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea,
        IonDatetime, IonDatetimeButton, IonModal, IonIcon
    ]
})
export class TransactionModalComponent implements OnInit {
    @Input() transaction: Transaction | null = null;
    @Input() type: 'RECEITA' | 'DESPESA' = 'DESPESA'; // Default if creating new

    title: string = 'Nova Transação';
    mode: 'CREATE' | 'EDIT' = 'CREATE';
    valorStr: string = '';

    // Form Data
    formData: Partial<Transaction> = {
        descricao: '',
        valor: 0,
        tipo: 'DESPESA',
        dataVencimento: new Date().toISOString(),
        status: 'PREVISTO',
        categoriaId: undefined,
        centroCustoId: undefined,
        contaBancariaId: undefined,
        observacoes: ''
    };

    categories: any[] = [];
    costCenters: any[] = [];
    bankAccounts: any[] = [];

    constructor(
        private modalCtrl: ModalController,
        private categoriesService: CategoriesService,
        private costCentersService: CostCentersService,
        private financialService: FinancialService
    ) {
        addIcons({ closeOutline, calendarOutline, cashOutline });
    }

    ngOnInit() {
        this.loadOptions();
        if (this.transaction) {
            this.mode = 'EDIT';
            this.title = 'Editar Transação';
            this.formData = { ...this.transaction };
            this.valorStr = this.formatValor(this.formData.valor);
            // Ensure date is ISO string for ionic components
            if (this.formData.dataVencimento && !this.formData.dataVencimento.includes('T')) {
                this.formData.dataVencimento = new Date(this.formData.dataVencimento).toISOString();
            }
        } else {
            this.mode = 'CREATE';
            this.title = this.type === 'RECEITA' ? 'Nova Receita' : 'Nova Despesa';
            this.formData.tipo = this.type;
            this.valorStr = '';
        }
    }

    loadOptions() {
        this.categoriesService.findAll().subscribe(cats => this.categories = cats);
        this.costCentersService.findAll().subscribe(ccs => this.costCenters = ccs);
        this.financialService.getBankAccounts().subscribe({
            next: (accounts) => this.bankAccounts = accounts,
            error: (err) => console.error('Error loading accounts in modal', err)
        });
    }

    isValid() {
        return this.formData.descricao &&
            this.formData.valor &&
            this.formData.valor > 0 &&
            this.formData.dataVencimento;
    }

    save() {
        if (!this.isValid()) return;
        this.modalCtrl.dismiss(this.formData, 'save');
    }

    cancel() {
        this.modalCtrl.dismiss(null, 'cancel');
    }

    formatValor(value: number | undefined | null): string {
        if (value === undefined || value === null || value === 0) return '';
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    onValorInput(event: any) {
        const val = event.target.value;
        this.valorStr = val;
        
        if (!val) {
            this.formData.valor = 0;
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
        this.formData.valor = isNaN(parsed) ? 0 : parsed;
    }

    onValorBlur(event: any) {
        this.valorStr = this.formatValor(this.formData.valor);
        event.target.value = this.valorStr;
    }

    onValorFocus(event: any) {
        if (this.formData.valor && this.formData.valor > 0) {
            this.valorStr = this.formData.valor.toString().replace('.', ',');
            event.target.value = this.valorStr;
        }
    }
}
