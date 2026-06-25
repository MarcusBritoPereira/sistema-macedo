import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea,
    IonDatetime, IonDatetimeButton, IonModal, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, calendarOutline, cashOutline, addOutline } from 'ionicons/icons';
import { FinancialService, Transaction } from '../../../services/financial/financial';
import { CategoriesService } from '../../../services/financial/categories.service';
import { CostCentersService } from '../../../services/financial/cost-centers.service';
import { ClientsService } from '../../../services/clients/clients';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { QuickCreateModalComponent } from '../quick-create-modal/quick-create-modal.component';

@Component({
    selector: 'app-transaction-modal',
    templateUrl: './transaction-modal.component.html',
    styleUrls: ['./transaction-modal.component.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, QuickCreateModalComponent,
        IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent,
        IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea,
        IonDatetime, IonDatetimeButton, IonModal, IonIcon
    ]
})
export class TransactionModalComponent implements OnInit {
    @Input() transaction: Transaction | null = null;
    @Input() presetData: Partial<Transaction> | null = null;
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
    clients: any[] = [];
    obras: any[] = [];

    constructor(
        private modalCtrl: ModalController,
        private categoriesService: CategoriesService,
        private costCentersService: CostCentersService,
        private financialService: FinancialService,
        private clientsService: ClientsService,
        private http: HttpClient
    ) {
        addIcons({ closeOutline, calendarOutline, cashOutline, addOutline });
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
            if (this.presetData) {
                this.formData = { ...this.formData, ...this.presetData };
            }
            this.valorStr = '';
        }
    }

    loadOptions() {
        this.categoriesService.findAll().subscribe((cats: any[]) => this.categories = cats);
        this.costCentersService.findAll().subscribe((ccs: any[]) => this.costCenters = ccs);
        this.financialService.getBankAccounts().subscribe({
            next: (accounts: any[]) => this.bankAccounts = accounts,
            error: (err: any) => console.error('Error loading accounts in modal', err)
        });
        this.clientsService.findAll().subscribe((c: any[]) => this.clients = c);
        this.http.get<any[]>(`${environment.apiUrl}/financial/obras`).subscribe((o: any[]) => this.obras = o);
    }

    isValid() {
        return this.formData.descricao &&
            this.formData.valor &&
            this.formData.valor > 0 &&
            this.formData.dataVencimento &&
            this.formData.categoriaId &&
            this.formData.contaBancariaId;
    }

    async quickCreateCategory() {
        const modal = await this.modalCtrl.create({
            component: QuickCreateModalComponent,
            componentProps: {
                entityType: 'CATEGORY',
                parentContext: this.formData.tipo
            }
        });
        await modal.present();
        const { data } = await modal.onWillDismiss();
        if (data) {
            this.categories.push(data);
            this.formData.categoriaId = data.id;
        }
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
