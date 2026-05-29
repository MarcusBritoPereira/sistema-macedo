
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea, IonBadge, IonSpinner, ToastController, AlertController, IonText, IonNote } from '@ionic/angular/standalone';
import { BankingIntegrationService, BankingStatus } from '../../services/financial/banking-integration.service';
import { FinancialService } from '../../services/financial/financial';
import { BankAccount } from '../../services/financial/financial';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, refreshOutline, cloudUploadOutline, linkOutline, businessOutline, saveOutline, documentAttachOutline, keyOutline, alertCircle, informationCircleOutline, addCircleOutline, trashOutline } from 'ionicons/icons';

@Component({
    selector: 'app-banking-configuration',
    templateUrl: './banking-configuration.page.html',
    styleUrls: ['./banking-configuration.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea, IonBadge, IonSpinner, IonText, IonNote]
})
export class BankingConfigurationPage implements OnInit {
    integrationForm: FormGroup;
    bankAccounts: BankAccount[] = [];
    status: BankingStatus = { status: 'NOT_CONFIGURED' };
    loadingStatus = false;
    syncing = false;
    selectedAccountId: string | null = null;
    showForm = false;

    certificateFile: File | null = null;
    privateKeyFile: File | null = null;
    certificateFileName = '';
    privateKeyFileName = '';

    constructor(
        private fb: FormBuilder,
        private bankingService: BankingIntegrationService,
        private financialService: FinancialService,
        private toastCtrl: ToastController,
        private alertCtrl: AlertController
    ) {
        addIcons({ checkmarkCircleOutline, closeCircleOutline, refreshOutline, cloudUploadOutline, linkOutline, businessOutline, saveOutline, documentAttachOutline, keyOutline, alertCircle, informationCircleOutline, addCircleOutline, trashOutline });

        this.integrationForm = this.fb.group({
            banco: ['', [Validators.required]],
            agencia: [''],
            conta: [''],
            codigoBanco: [''],
            clientId: ['', [Validators.required]],
            clientSecret: ['', [Validators.required]],
            contaBancariaId: [''], // Hidden field for ID
            dataInicioAutomacao: ['']
        });

        // Check if we have navigation params (e.g. redirected from dashboard)
        // For now, default is empty
    }

    ngOnInit() {
        this.loadBankAccounts();
    }

    loadBankAccounts() {
        this.financialService.getBankAccounts().subscribe(accounts => {
            this.bankAccounts = accounts;
        });
    }

    selectAccount(acc: BankAccount) {
        this.selectedAccountId = acc.id;
        this.showForm = true;
        this.integrationForm.patchValue({
            banco: acc.banco,
            agencia: acc.agencia || '',
            conta: acc.conta || '',
            codigoBanco: acc.codigoBanco || '',
            contaBancariaId: acc.id,
            clientId: '******',
            clientSecret: '******',
            dataInicioAutomacao: acc.integracao?.dataInicioAutomacao ? acc.integracao.dataInicioAutomacao.substring(0, 10) : ''
        });

        // Load detailed status (including last sync which might not be in the list view)
        this.loadStatus(acc.id);

        // Scroll to form
        const formEl = document.querySelector('form');
        if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
    }

    clearSelection() {
        this.selectedAccountId = null;
        this.status = { status: 'NOT_CONFIGURED' };
        this.integrationForm.reset();
        this.certificateFile = null;
        this.privateKeyFile = null;
        this.certificateFileName = '';
        this.privateKeyFileName = '';
        this.showForm = true;
    }

    hideForm() {
        this.showForm = false;
        this.selectedAccountId = null;
        this.status = { status: 'NOT_CONFIGURED' };
        this.integrationForm.reset();
        this.certificateFile = null;
        this.privateKeyFile = null;
        this.certificateFileName = '';
        this.privateKeyFileName = '';
    }

    // Removed onAccountChange as we now use the list selection
    // onAccountChange(event: any) { ... }

    loadStatus(accountId: string) {
        this.loadingStatus = true;
        this.bankingService.getStatus(accountId).subscribe({
            next: (status) => {
                this.status = status;
                if (status.dataInicioAutomacao) {
                    this.integrationForm.patchValue({
                        dataInicioAutomacao: status.dataInicioAutomacao.substring(0, 10)
                    });
                } else {
                    this.integrationForm.patchValue({
                        dataInicioAutomacao: ''
                    });
                }
                this.loadingStatus = false;
            },
            error: () => {
                this.status = { status: 'ERROR' };
                this.loadingStatus = false;
            }
        });
    }

    onFileSelected(event: any, type: 'certificate' | 'privateKey') {
        const file = event.target.files[0];
        if (file) {
            if (type === 'certificate') {
                this.certificateFile = file;
                this.certificateFileName = file.name;
            } else {
                this.privateKeyFile = file;
                this.privateKeyFileName = file.name;
            }
        }
    }

    triggerFileInput(inputId: string) {
        document.getElementById(inputId)?.click();
    }

    async onConnect() {
        if (this.integrationForm.invalid) {
            this.showToast('Preencha os campos obrigatórios', 'warning');
            return;
        }

        const config = this.integrationForm.value;

        // Ensure files are present for new connections
        if (!config.contaBancariaId && (!this.certificateFile || !this.privateKeyFile)) {
            this.showToast('Certificado e Chave são obrigatórios para nova conexão.', 'warning');
            return;
        }

        const alert = await this.alertCtrl.create({
            header: 'Confirmar Conexão',
            message: `Deseja configurar a integração com <b>${config.banco}</b>?`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Conectar',
                    handler: () => this.executeConnect(config)
                }
            ]
        });
        await alert.present();
    }

    async deleteAccount(event: Event, acc: BankAccount) {
        event.stopPropagation(); // Prevent card click (selection)

        const alert = await this.alertCtrl.create({
            header: 'Excluir Conta?',
            message: `Tem certeza que deseja excluir a conta <b>${acc.nome}</b>? <br>Isso removerá a integração e os dados da conta.`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Excluir',
                    role: 'destructive',
                    handler: () => {
                        this.executeDelete(acc.id);
                    }
                }
            ]
        });
        await alert.present();
    }

    executeDelete(id: string) {
        this.loadingStatus = true;
        this.financialService.deleteBankAccount(id).subscribe({
            next: () => {
                this.showToast('Conta removida com sucesso.', 'success');
                this.loadBankAccounts();
                if (this.selectedAccountId === id) {
                    this.clearSelection();
                    this.showForm = false;
                }
                this.loadingStatus = false;
            },
            error: (err) => {
                console.error(err);
                this.showToast('Erro ao excluir conta. Verifique se há transações vinculadas.', 'danger');
                this.loadingStatus = false;
            }
        });
    }

    executeConnect(config: any) {
        this.loadingStatus = true;

        const formData = new FormData();
        formData.append('banco', config.banco);
        formData.append('agencia', config.agencia || '');
        formData.append('conta', config.conta || '');
        formData.append('codigoBanco', config.codigoBanco || '');
        formData.append('clientId', config.clientId);
        formData.append('clientSecret', config.clientSecret);
        formData.append('dataInicioAutomacao', config.dataInicioAutomacao || '');
        if (config.contaBancariaId) {
            formData.append('contaBancariaId', config.contaBancariaId);
        }

        if (this.certificateFile) {
            formData.append('certificate', this.certificateFile);
        }
        if (this.privateKeyFile) {
            formData.append('privateKey', this.privateKeyFile);
        }

        this.bankingService.configure(formData).subscribe({
            next: (res: any) => {
                this.showToast('Integração configurada com sucesso!', 'success');
                // Use ID from response if available, or try to infer, but response is best
                const accountId = res.contaBancariaId;
                if (accountId) {
                    this.selectedAccountId = accountId;
                    this.loadStatus(accountId);
                }

                // Clear sensitive fields
                this.integrationForm.patchValue({
                    clientId: '',
                    clientSecret: ''
                });
                this.certificateFile = null;
                this.privateKeyFile = null;
                this.certificateFileName = '';
                this.privateKeyFileName = '';
                this.loadingStatus = false;
                this.loadBankAccounts();
                this.showForm = false;
            },
            error: (err) => {
                console.error(err);
                const msg = err.error?.message || 'Falha ao conectar. Verifique suas credenciais.';
                this.showToast(msg, 'danger');
                this.loadingStatus = false;
                this.status = { status: 'ERROR' };
            }
        });
    }

    executeSync() {
        if (!this.selectedAccountId) return;

        this.syncing = true;
        this.bankingService.sync(this.selectedAccountId).subscribe({
            next: (res) => {
                this.syncing = false;
                this.showToast(res.message, 'success');
                this.loadStatus(this.selectedAccountId!); // Update last sync
            },
            error: (err) => {
                console.error(err);
                this.syncing = false;
                this.showToast('Erro ao sincronizar extrato.', 'danger');
            }
        });
    }

    async showToast(msg: string, color: string) {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 3000,
            color: color,
            position: 'bottom'
        });
        toast.present();
    }

    openInterInstructions() {
        window.open('https://www.bancointer.com.br/empresas/solucoes/', '_blank');
    }
}
