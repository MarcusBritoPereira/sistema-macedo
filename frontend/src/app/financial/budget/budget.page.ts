import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, createOutline, trendingUpOutline, trendingDownOutline, walletOutline, downloadOutline } from 'ionicons/icons';
import { FinancialBudgetService, FinancialBudget } from '../../services/financial/financial-budget.service';

@Component({
    selector: 'app-budget',
    templateUrl: './budget.page.html',
    styleUrls: ['./budget.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class BudgetPage implements OnInit {
    currentYear: number = new Date().getFullYear();
    budgets: FinancialBudget[] = [];
    months = Array(12).fill(0); // For looping 1-12

    constructor(
        private budgetService: FinancialBudgetService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController
    ) {
        addIcons({ chevronBack, chevronForward, createOutline, trendingUpOutline, trendingDownOutline, walletOutline, downloadOutline });
    }

    ngOnInit() {
        this.loadBudgets();
    }

    loadBudgets() {
        this.budgetService.getBudgets(this.currentYear).subscribe({
            next: (data: FinancialBudget[]) => {
                this.budgets = data;
            },
            error: (err: any) => {
                console.error(err);
                this.showToast('Erro ao carregar orçamentos.', 'danger');
            }
        });
    }

    changeYear(delta: number) {
        this.currentYear += delta;
        this.loadBudgets();
    }

    getBudget(month: number) {
        return this.budgets.find(b => b.mes === month);
    }

    getMonthName(month: number): string {
        const date = new Date(this.currentYear, month - 1, 1);
        return date.toLocaleString('pt-BR', { month: 'long' });
    }

    get totalReceitaMeta(): number {
        return this.budgets.reduce((acc, curr) => acc + Number(curr.receitaMeta), 0);
    }

    get totalDespesaMeta(): number {
        return this.budgets.reduce((acc, curr) => acc + Number(curr.despesaMeta), 0);
    }

    async openEditModal(month: number) {
        const budget = this.getBudget(month);
        const monthName = this.getMonthName(month);

        const alert = await this.alertCtrl.create({
            header: `Orçamento: ${monthName}/${this.currentYear}`,
            inputs: [
                {
                    name: 'receita',
                    type: 'number',
                    placeholder: 'Meta de Receita',
                    value: budget?.receitaMeta,
                    label: 'Receita (R$)'
                },
                {
                    name: 'despesa',
                    type: 'number',
                    placeholder: 'Meta de Despesa',
                    value: budget?.despesaMeta,
                    label: 'Despesa (R$)'
                }
            ],
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Salvar',
                    handler: (data) => {
                        this.saveBudget(month, data.receita, data.despesa);
                    }
                }
            ]
        });

        await alert.present();
    }

    saveBudget(month: number, receita: string, despesa: string) {
        const r = parseFloat(receita || '0');
        const d = parseFloat(despesa || '0');

        this.budgetService.upsertBudget({
            mes: month,
            ano: this.currentYear,
            receitaMeta: r,
            despesaMeta: d
        }).subscribe({
            next: (newBudget: FinancialBudget) => {
                // Update local state locally to reflect immediately or reload
                // Since upsert returns the object, we can update our list
                const idx = this.budgets.findIndex(b => b.mes === month);
                if (idx >= 0) {
                    this.budgets[idx] = newBudget;
                } else {
                    this.budgets.push(newBudget);
                }
                this.showToast('Orçamento salvo com sucesso!');
            },
            error: () => {
                this.showToast('Erro ao salvar.', 'danger');
            }
        });
    }

    async showToast(msg: string, color: string = 'success') {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 2000,
            color: color,
            position: 'bottom'
        });
        toast.present();
    }

    exportCSV() {
        const headers = ['Mês', 'Ano', 'Meta Receita', 'Meta Despesa', 'Resultado'];

        const rows = this.months.map((_, i) => {
            const mesName = this.getMonthName(i + 1);
            const budget = this.getBudget(i + 1);
            const receita = budget?.receitaMeta || 0;
            const despesa = budget?.despesaMeta || 0;
            const resultado = receita - despesa;

            return [
                `"${mesName}"`,
                this.currentYear,
                receita,
                despesa,
                resultado
            ].join(',');
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `orcamento_${this.currentYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
