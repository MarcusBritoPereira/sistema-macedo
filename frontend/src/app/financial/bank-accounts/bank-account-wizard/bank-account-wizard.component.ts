
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonContent, IonRadio, IonRadioGroup, IonItem,
    IonLabel, IonList, ModalController, IonInput, IonSelect,
    IonSelectOption, IonCheckbox, ToastController, IonSpinner
} from '@ionic/angular/standalone';
import { FinancialService, BankAccount } from '../../../services/financial/financial';
import { addIcons } from 'ionicons';
import {
    closeOutline, businessOutline, walletOutline, cardOutline,
    trendingUpOutline, cashOutline, syncOutline, arrowForwardOutline,
    checkmarkCircle, checkmarkOutline, openOutline, calendarOutline,
    helpCircleOutline
} from 'ionicons/icons';

@Component({
    selector: 'app-bank-account-wizard',
    templateUrl: './bank-account-wizard.component.html',
    styleUrls: ['./bank-account-wizard.component.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle,
        IonButtons, IonButton, IonIcon, IonContent, IonRadio,
        IonRadioGroup, IonItem, IonLabel, IonList, IonInput,
        IonSelect, IonSelectOption, IonCheckbox, IonSpinner
    ]
})
export class BankAccountWizardComponent implements OnInit {
    @Input() accountToEdit?: BankAccount;

    currentStep: number = 1;
    selectedType: string = 'CORRENTE';
    loading: boolean = false;

    // Step 3 Form Data (Persistent through wizard)
    formData = {
        banco: '',
        agencia: '',
        conta: '',
        nome: '',
        modalidade: 'PJ',
        isDefault: false,
        integrationMode: 'AUTOMATIC',
        startingDate: '',
        startingBalance: 0
    };

    banks = [
        { name: 'Caixinha (Dinheiro Físico)', code: 'CAIXA' },
        { name: 'Banco Inter', code: '077' },
        { name: 'Nubank', code: '260' },
        { name: 'Itaú', code: '341' },
        { name: 'Bradesco', code: '237' },
        { name: 'Santander', code: '033' },
        { name: 'Caixa Econômica Federal', code: '104' },
        { name: 'Banco do Brasil', code: '001' }
    ];

    accountTypes = [
        {
            id: 'CORRENTE',
            title: 'Conta corrente',
            description: 'Conecte sua conta bancária para manter o fluxo de caixa sempre conciliado.',
            icon: 'business-outline',
            main: true
        },
        {
            id: 'CAIXINHA',
            title: 'Conta Caixinha',
            description: 'Registre entradas e saídas em dinheiro, como caixa físico ou fundo fixo.',
            icon: 'wallet-outline',
            main: true
        },
        {
            id: 'CARTAO',
            title: 'Cartão de crédito',
            description: 'Centralize faturas e despesas do cartão empresarial em uma tela exclusiva.',
            icon: 'card-outline',
            main: true
        }
    ];

    otherOptions = [
        {
            id: 'INVESTIMENTO',
            title: 'Investimento',
            description: 'Acompanhe aplicações e rendimentos.',
            icon: 'trending-up-outline'
        },
        {
            id: 'POUPANCA',
            title: 'Conta poupança',
            description: 'Controle depósitos e resgates separados da conta corrente.',
            icon: 'wallet-outline'
        },
        {
            id: 'RECEBIMENTO',
            title: 'Conta recebimento',
            description: 'Controle recebíveis de PagBank, Stone, PayPal e similares.',
            icon: 'cash-outline'
        },
        {
            id: 'APLICACAO',
            title: 'Aplicação automática',
            description: 'Registre aplicações automáticas entre contas da empresa.',
            icon: 'sync-outline'
        },
        {
            id: 'OUTRAS',
            title: 'Outras contas',
            description: 'Registre movimentos específicos, como empréstimos de sócios.',
            icon: 'business-outline'
        }
    ];

    integrationOptions = [
        {
            id: 'AUTOMATIC',
            title: 'Integrar extrato automaticamente',
            recommended: true,
            description: 'A melhor forma de manter seu financeiro atualizado.',
            benefits: [
                'Lançamentos chegam automaticamente todos os dias.',
                'Conciliação mais rápida e precisa.',
                'Tudo em um só lugar: vendas, contas e extrato.'
            ],
            footer: 'Os lançamentos dos últimos 30 dias serão importados.'
        },
        {
            id: 'MANUAL',
            title: 'Importar extrato manualmente',
            description: 'Importe o extrato do seu banco quando quiser.',
            benefits: [
                'Ideal para bancos sem integração automática.',
                'Importe arquivos .OFX baixado do seu internet banking.',
                'Concilie os lançamentos com o financeiro'
            ],
            footer: [
                'Os lançamentos podem ser importados até o dia de ontem.',
                'O formato do arquivo deve ser .OFX (Money 2000 v.102).'
            ]
        },
        {
            id: 'NONE',
            title: 'Cadastrar sem extrato',
            description: 'Cadastre sua conta agora e integre ou importe depois.',
            benefits: [
                'Comece a usar a conta no sistema imediatamente.',
                'Você pode integrar ou importar extratos depois.'
            ],
            negative: [
                'O cadastro da conta não trará o sua movimentação.'
            ]
        }
    ];

    constructor(
        private modalCtrl: ModalController,
        private financialService: FinancialService,
        private toastCtrl: ToastController
    ) {
        addIcons({
            closeOutline, businessOutline, walletOutline, cardOutline,
            trendingUpOutline, cashOutline, syncOutline, arrowForwardOutline,
            checkmarkCircle, checkmarkOutline, openOutline, calendarOutline,
            helpCircleOutline
        });
    }

    ngOnInit() {
        if (this.accountToEdit) {
            this.currentStep = 2; // Pula a etapa inicial
            this.selectedType = this.accountToEdit.banco === 'Caixinha (Dinheiro Físico)' ? 'CAIXINHA' : 'CORRENTE';
            this.formData.nome = this.accountToEdit.nome;
            this.formData.banco = this.accountToEdit.banco || '';
            this.formData.agencia = this.accountToEdit.agencia || '';
            this.formData.conta = this.accountToEdit.conta || '';
            this.formData.startingBalance = this.accountToEdit.saldo || 0;
            // Se for caixinha já pula direto
            if (this.selectedType === 'CAIXINHA') {
                this.currentStep = 2; // Pode editar o nome e o saldo (veremos na step 2)
            }
        }
    }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    async next() {
        if (this.currentStep < 3) {
            this.currentStep++;
        } else {
            // Step 3 is the last step with "Finalizar"
            await this.saveAccount();
        }
    }

    async saveAccount() {
        this.loading = true;

        // Find bank code if needed
        const selectedBank = this.banks.find(b => b.name === this.formData.banco);

        const payload = {
            nome: this.formData.nome,
            banco: this.formData.banco,
            agencia: this.formData.agencia,
            conta: this.formData.conta,
            codigoBanco: selectedBank?.code || '',
            saldoInicial: this.formData.startingBalance || 0
        };

        if (this.accountToEdit) {
            this.financialService.updateBankAccount(this.accountToEdit.id, payload).subscribe({
                next: (res) => {
                    this.loading = false;
                    this.showToast('Conta atualizada com sucesso!', 'success');
                    this.modalCtrl.dismiss({ refresh: true });
                },
                error: (err) => {
                    this.loading = false;
                    console.error('Error updating account:', err);
                    this.showToast('Erro ao atualizar conta bancária.', 'danger');
                }
            });
        } else {
            this.financialService.createBankAccount(payload).subscribe({
                next: (res) => {
                    this.loading = false;
                    this.showToast('Conta cadastrada com sucesso!', 'success');
                    this.modalCtrl.dismiss({ refresh: true });
                },
                error: (err) => {
                    this.loading = false;
                    console.error('Error saving account:', err);
                    this.showToast('Erro ao cadastrar conta bancária.', 'danger');
                }
            });
        }
    }

    async showToast(message: string, color: string) {
        const toast = await this.toastCtrl.create({
            message,
            duration: 3000,
            color,
            position: 'bottom'
        });
        await toast.present();
    }

    selectType(typeId: string) {
        this.selectedType = typeId;
        if (typeId === 'CAIXINHA') {
            this.formData.banco = 'Caixinha (Dinheiro Físico)';
            this.formData.agencia = '0000';
            this.formData.conta = '0000-0';
        }
    }

    isArray(val: any): boolean {
        return Array.isArray(val);
    }
}
