import { Component, OnInit } from '@angular/core';
import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  DecimalPipe
} from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calculatorOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  sendOutline
} from 'ionicons/icons';

import {
  StockActualVsBudget,
  StockBudget,
  StockService
} from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-budget-detail',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner
  ],
  templateUrl: './stock-budget-detail.page.html',
  styleUrls: ['./stock-budget-detail.page.scss']
})
export class StockBudgetDetailPage implements OnInit {
  id = '';
  loading = true;
  saving = false;
  errorMessage = '';

  budget?: StockBudget;
  comparison?: StockActualVsBudget;

  constructor(
    private route: ActivatedRoute,
    private stock: StockService,
    private alertCtrl: AlertController
  ) {
    addIcons({
      arrowBackOutline,
      calculatorOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      sendOutline
    });
  }

  ngOnInit(): void {
    this.id =
      this.route.snapshot.paramMap.get('id') || '';

    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      budget: this.stock.getBudget(this.id),
      comparison:
        this.stock.getActualVsBudget(this.id)
    }).subscribe({
      next: result => {
        this.budget = result.budget;
        this.comparison = result.comparison;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível carregar o orçamento.';
      }
    });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      RASCUNHO: 'Rascunho',
      PENDENTE_APROVACAO:
        'Aguardando aprovação',
      APROVADO: 'Aprovado',
      CANCELADO: 'Cancelado',
      SUBSTITUIDO: 'Substituído'
    };

    return status
      ? labels[status] || status
      : '-';
  }

  get budgetCost(): number {
    return Number(
      this.comparison?.totals.custoOrcado || 0
    );
  }

  get realCost(): number {
    return Number(
      this.comparison?.totals.custoReal || 0
    );
  }

  get deviation(): number {
    return Number(
      this.comparison?.totals.desvioCusto || 0
    );
  }

  get costUsagePercent(): number {
    if (!this.budgetCost) return 0;

    return (
      (this.realCost / this.budgetCost) *
      100
    );
  }

  get aboveBudgetItems(): number {
    return (
      this.comparison?.items.filter(
        item => item.situacao === 'ACIMA'
      ).length || 0
    );
  }

  submit(): void {
    this.runAction(
      this.stock.submitBudget(this.id),
      'Não foi possível enviar para aprovação.'
    );
  }

  approve(): void {
    this.runAction(
      this.stock.approveBudget(this.id),
      'Não foi possível aprovar o orçamento.'
    );
  }

  async cancel(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar orçamento',
      message:
        'O orçamento será marcado como cancelado e deixará de seguir o fluxo de aprovação.',
      buttons: [
        {
          text: 'Voltar',
          role: 'cancel'
        },
        {
          text: 'Cancelar orçamento',
          role: 'confirm',
          handler: () => {
            this.runAction(
              this.stock.cancelBudget(this.id),
              'Não foi possível cancelar o orçamento.'
            );
          }
        }
      ]
    });

    await alert.present();
  }

  private runAction(
    request: any,
    fallbackMessage: string
  ): void {
    this.saving = true;
    this.errorMessage = '';

    request.subscribe({
      next: () => {
        this.saving = false;
        this.load();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          fallbackMessage;
      }
    });
  }
}
