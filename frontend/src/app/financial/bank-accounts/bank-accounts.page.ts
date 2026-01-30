
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
    IonMenuButton, IonButton, IonIcon, IonBadge, IonSpinner,
    ToastController, AlertController, ModalController, NavController
} from '@ionic/angular/standalone';
import { FinancialService, BankAccount } from '../../services/financial/financial';
import { addIcons } from 'ionicons';
import {
    searchOutline, addOutline, settingsOutline,
    createOutline, trashOutline, helpCircleOutline,
    checkmarkCircleOutline, alertCircleOutline,
    chevronDown, chevronBack, chevronForward, filterOutline,
    businessOutline
} from 'ionicons/icons';
import { RouterLink } from '@angular/router';
import { BankAccountWizardComponent } from './bank-account-wizard/bank-account-wizard.component';

@Component({
    selector: 'app-bank-accounts',
    templateUrl: './bank-accounts.page.html',
    styleUrls: ['./bank-accounts.page.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, IonContent, IonHeader, IonTitle,
        IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon,
        IonBadge, IonSpinner, RouterLink, BankAccountWizardComponent
    ]
})
export class BankAccountsPage implements OnInit {
    bankAccounts: BankAccount[] = [];
    filteredAccounts: BankAccount[] = [];
    searchQuery: string = '';
    loading: boolean = false;

    constructor(
        private financialService: FinancialService,
        private toastCtrl: ToastController,
        private alertCtrl: AlertController,
        private modalCtrl: ModalController,
        private navCtrl: NavController
    ) {
        addIcons({
            searchOutline, addOutline, settingsOutline,
            createOutline, trashOutline, helpCircleOutline,
            checkmarkCircleOutline, alertCircleOutline,
            chevronDown, chevronBack, chevronForward, filterOutline,
            businessOutline
        });
    }

    ngOnInit() {
        this.loadAccounts();
    }

    loadAccounts() {
        this.loading = true;
        this.financialService.getBankAccounts().subscribe({
            next: (accounts) => {
                this.bankAccounts = accounts;
                this.filterAccounts();
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.showToast('Erro ao carregar contas bancárias', 'danger');
                this.loading = false;
            }
        });
    }

    filterAccounts() {
        if (!this.searchQuery.trim()) {
            this.filteredAccounts = [...this.bankAccounts];
        } else {
            const query = this.searchQuery.toLowerCase();
            this.filteredAccounts = this.bankAccounts.filter(acc =>
                acc.nome.toLowerCase().includes(query) ||
                acc.banco.toLowerCase().includes(query)
            );
        }
    }

    onSearch(event: any) {
        this.searchQuery = event.target.value;
        this.filterAccounts();
    }

    async deleteAccount(acc: BankAccount) {
        const alert = await this.alertCtrl.create({
            header: 'Excluir Conta?',
            message: `Tem certeza que deseja excluir a conta <b>${acc.nome}</b>?`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Excluir',
                    role: 'destructive',
                    handler: () => {
                        this.financialService.deleteBankAccount(acc.id).subscribe({
                            next: () => {
                                this.showToast('Conta excluída com sucesso', 'success');
                                this.loadAccounts();
                            },
                            error: (err) => {
                                console.error(err);
                                this.showToast('Erro ao excluir conta', 'danger');
                            }
                        });
                    }
                }
            ]
        });
        await alert.present();
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

    async configureAutoConciliation() {
        this.showToast('Funcionalidade em desenvolvimento', 'primary');
    }

    async openWizard(accountToEdit?: BankAccount) {
        try {
            const modal = await this.modalCtrl.create({
                component: BankAccountWizardComponent,
                cssClass: 'wizard-modal',
                componentProps: {
                    existingAccount: accountToEdit // Pass the account if editing
                }
            });

            await modal.present();

            const { data } = await modal.onWillDismiss();

            if (data?.refresh) {
                this.loadAccounts();
            }
        } catch (err) {
            console.error('BankAccountsPage: Error in openWizard', err);
        }
    }

    editAccount(acc: BankAccount) {
        this.openWizard(acc);
    }

    goToReconciliation(accountId: string) {
        this.navCtrl.navigateForward(['/financial/reconciliation'], {
            queryParams: { accountId }
        });
    }
}
