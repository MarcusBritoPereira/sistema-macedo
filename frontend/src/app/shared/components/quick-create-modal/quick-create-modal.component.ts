import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, ModalController, IonSpinner, IonText, ToastController } from '@ionic/angular/standalone';
import { CategoriesService } from '../../../services/financial/categories.service';
import { SuppliersService } from '../../../services/suppliers/suppliers.service';
import { ClientsService } from '../../../services/clients/clients';
import { CostCentersService } from '../../../services/financial/cost-centers.service';

export type EntityType = 'CATEGORY' | 'SUPPLIER' | 'CLIENT' | 'COST_CENTER';

@Component({
    selector: 'app-quick-create-modal',
    templateUrl: './quick-create-modal.component.html',
    styleUrls: ['./quick-create-modal.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonSpinner, IonText]
})
export class QuickCreateModalComponent implements OnInit {
    @Input() entityType!: EntityType;
    @Input() initialName: string = '';
    // For CATEGORY, we might need to know the type/direction (RECEITA/DESPESA)
    @Input() parentContext?: 'RECEITA' | 'DESPESA';

    title: string = '';
    isLoading = false;

    form = {
        nome: '',
        descricao: '', // Optional
        tipo: 'DESPESA', // Only for Category
        classificacao: '', // New field
        cpfCnpj: '' // Optional for Supplier/Client
    };

    constructor(
        private modalCtrl: ModalController,
        private toastCtrl: ToastController,
        private categoriesService: CategoriesService,
        private suppliersService: SuppliersService,
        private clientsService: ClientsService,
        private costCentersService: CostCentersService
    ) { }

    dreOptions: any[] = [];

    ngOnInit() {
        this.form.nome = this.initialName || '';

        if (this.parentContext) {
            this.form.tipo = this.parentContext;
        }

        switch (this.entityType) {
            case 'CATEGORY': 
                this.title = 'Nova Categoria'; 
                this.updateDreOptions();
                break;
            case 'SUPPLIER': this.title = 'Novo Fornecedor'; break;
            case 'CLIENT': this.title = 'Novo Cliente'; break;
            case 'COST_CENTER': this.title = 'Novo Centro de Custo'; break;
        }
    }

    updateDreOptions() {
        if (this.form.tipo === 'RECEITA') {
            this.dreOptions = [
                { value: 'RECEITA_RECORRENTE', label: 'Receita Recorrente' },
                { value: 'RECEITA_NAO_RECORRENTE', label: 'Receita Não Recorrente' },
                { value: 'RECEITA_FINANCEIRA', label: 'Receita Financeira' },
                { value: 'OUTROS', label: 'Outros' }
            ];
        } else {
            this.dreOptions = [
                { value: 'DESPESA_ADMINISTRATIVA', label: 'Despesa Administrativa' },
                { value: 'CUSTO_SERVICOS_PRESTADOS', label: 'Custo dos Serviços Prestados' },
                { value: 'DEDUCOES_RECEITA', label: 'Deduções da Receita' },
                { value: 'DESPESA_COMERCIAL', label: 'Despesa Comercial' },
                { value: 'DESPESA_ESTRUTURAL', label: 'Despesa Estrutural' },
                { value: 'DESPESA_SOCIOS', label: 'Despesa Sócios' },
                { value: 'DESPESA_FINANCEIRA', label: 'Despesa Financeira' },
                { value: 'IMPOSTOS_LUCRO', label: 'Impostos s/ Lucro' },
                { value: 'INVESTIMENTOS', label: 'Investimentos' },
                { value: 'OUTROS', label: 'Outros' }
            ];
        }
    }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    save() {
        if (!this.form.nome.trim()) return;

        this.isLoading = true;

        switch (this.entityType) {
            case 'CATEGORY':
                this.createCategory();
                break;
            case 'SUPPLIER':
                this.createSupplier();
                break;
            case 'CLIENT':
                this.createClient();
                break;
            case 'COST_CENTER':
                this.createCostCenter();
                break;
        }
    }

    private createCategory() {
        const payload = {
            nome: this.form.nome,
            tipo: this.form.tipo as 'RECEITA' | 'DESPESA',
            descricao: this.form.descricao,
            classificacao: this.form.classificacao
        };
        this.categoriesService.create(payload).subscribe({
            next: (res) => this.modalCtrl.dismiss(res),
            error: (err) => this.handleError(err)
        });
    }

    private createSupplier() {
        const payload = {
            nomeFantasia: this.form.nome,
            razaoSocial: this.form.nome, // Default to same
            cnpj: this.form.cpfCnpj,
            ativo: true
        };
        this.suppliersService.create(payload).subscribe({
            next: (res) => this.modalCtrl.dismiss(res),
            error: (err) => this.handleError(err)
        });
    }

    private createClient() {
        const digits = this.form.cpfCnpj?.replace(/\D/g, '') || '';
        const payload = {
            nomeFantasia: this.form.nome,
            razaoSocial: this.form.nome,
            cpf: digits.length === 11 ? digits : undefined,
            cnpj: digits.length === 14 ? digits : undefined,
            ativo: true
        };
        this.clientsService.create(payload).subscribe({
            next: (res) => this.modalCtrl.dismiss(res),
            error: (err) => this.handleError(err)
        });
    }

    private createCostCenter() {
        // Assuming structure, adjusting to likely service signature
        const payload = {
            nome: this.form.nome,
            descricao: this.form.descricao,
            ativo: true
        };
        this.costCentersService.create(payload).subscribe({
            next: (res) => this.modalCtrl.dismiss(res),
            error: (err) => this.handleError(err)
        });
    }

    private async handleError(err: any) {
        console.error(err);
        this.isLoading = false;

        const message =
            err?.error?.message ||
            'Não foi possível salvar. Revise os dados e tente novamente.';

        const toast = await this.toastCtrl.create({
            message,
            duration: 3000,
            color: 'danger',
            position: 'bottom'
        });
        await toast.present();
    }
}
