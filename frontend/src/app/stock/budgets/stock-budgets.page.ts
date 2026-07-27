import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calculatorOutline,
  closeOutline,
  refreshOutline,
  trashOutline
} from 'ionicons/icons';

import {
  Obra,
  ObrasService
} from '../../services/financial/obras.service';

import {
  StockBudget,
  StockBudgetPayload,
  StockMaterial,
  StockService
} from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-budgets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea
  ],
  templateUrl: './stock-budgets.page.html',
  styleUrls: ['./stock-budgets.page.scss']
})
export class StockBudgetsPage implements OnInit {
  loading = true;
  saving = false;
  drawerOpen = false;
  errorMessage = '';

  search = '';
  statusFilter = '';
  obraFilter = '';

  budgets: StockBudget[] = [];
  obras: Obra[] = [];
  materials: StockMaterial[] = [];

  form: StockBudgetPayload = this.emptyForm();

  constructor(
    private stock: StockService,
    private obrasService: ObrasService
  ) {
    addIcons({
      addOutline,
      calculatorOutline,
      closeOutline,
      refreshOutline,
      trashOutline
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.load();
  }

  loadReferenceData(): void {
    this.obrasService.getAll().subscribe({
      next: r => {
        this.obras = r || [];
      }
    });

    this.stock.getMaterials({
      take: 500,
      ativo: true
    }).subscribe({
      next: r => {
        this.materials = r.items || [];
      }
    });
  }

  load(): void {
    this.loading = true;

    const params: any = {
      take: 100
    };

    if (this.search.trim()) {
      params.search = this.search.trim();
    }

    if (this.statusFilter) {
      params.status = this.statusFilter;
    }

    if (this.obraFilter) {
      params.obraId = this.obraFilter;
    }

    this.stock.getBudgets(params).subscribe({
      next: r => {
        this.budgets = r.items || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.obraFilter = '';
    this.load();
  }

  openDrawer(): void {
    this.errorMessage = '';
    this.form = this.emptyForm();
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    if (this.saving) return;
    this.drawerOpen = false;
  }

  addItem(): void {
    this.form.items.push({
      materialId: '',
      quantidadeOrcada: '1',
      custoUnitarioOrcado: '0',
      etapaObra: ''
    });
  }

  removeItem(index: number): void {
    if (this.form.items.length === 1) return;
    this.form.items.splice(index, 1);
  }

  itemTotal(item: any): number {
    return (
      Number(item.quantidadeOrcada || 0) *
      Number(item.custoUnitarioOrcado || 0)
    );
  }

  get formTotal(): number {
    return this.form.items.reduce(
      (total, item) =>
        total + this.itemTotal(item),
      0
    );
  }

  isValid(): boolean {
    return (
      !!this.form.obraId &&
      !!this.form.dataReferencia &&
      this.form.items.length > 0 &&
      this.form.items.every(
        item =>
          !!item.materialId &&
          Number(item.quantidadeOrcada) > 0 &&
          Number(item.custoUnitarioOrcado) >= 0
      )
    );
  }

  save(): void {
    if (!this.isValid()) {
      this.errorMessage =
        'Preencha a obra, a data e todos os itens corretamente.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload: StockBudgetPayload = {
      ...this.form,
      observacao:
        this.form.observacao?.trim() || undefined,
      items: this.form.items.map(item => ({
        ...item,
        etapaObra:
          item.etapaObra?.trim() || undefined,
        observacao:
          item.observacao?.trim() || undefined
      }))
    };

    this.stock.createBudget(payload).subscribe({
      next: () => {
        this.saving = false;
        this.drawerOpen = false;
        this.form = this.emptyForm();
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível salvar o orçamento.';
      }
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      RASCUNHO: 'Rascunho',
      PENDENTE_APROVACAO: 'Aguardando aprovação',
      APROVADO: 'Aprovado',
      CANCELADO: 'Cancelado',
      SUBSTITUIDO: 'Substituído'
    };

    return labels[status] || status;
  }

  get totalBudgets(): number {
    return this.budgets.length;
  }

  get drafts(): number {
    return this.budgets.filter(
      item => item.status === 'RASCUNHO'
    ).length;
  }

  get pending(): number {
    return this.budgets.filter(
      item =>
        item.status === 'PENDENTE_APROVACAO'
    ).length;
  }

  get approved(): number {
    return this.budgets.filter(
      item => item.status === 'APROVADO'
    ).length;
  }

  get totalValue(): number {
    return this.budgets.reduce(
      (total, item) =>
        total +
        Number(item.valorTotalOrcado || 0),
      0
    );
  }

  private emptyForm(): StockBudgetPayload {
    return {
      obraId: '',
      dataReferencia:
        new Date().toISOString().slice(0, 10),
      observacao: '',
      items: [
        {
          materialId: '',
          quantidadeOrcada: '1',
          custoUnitarioOrcado: '0',
          etapaObra: ''
        }
      ]
    };
  }
}
