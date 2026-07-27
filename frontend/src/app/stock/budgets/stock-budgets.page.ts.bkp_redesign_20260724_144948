import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, calculatorOutline, refreshOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { Obra, ObrasService } from '../../services/financial/obras.service';
import { StockBudget, StockBudgetPayload, StockMaterial, StockService } from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe, RouterLink, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea],
  templateUrl: './stock-budgets.page.html',
  styleUrls: ['./stock-budgets.page.scss']
})
export class StockBudgetsPage implements OnInit {
  loading = true;
  saving = false;
  search = '';
  budgets: StockBudget[] = [];
  obras: Obra[] = [];
  materials: StockMaterial[] = [];
  form: StockBudgetPayload = this.emptyForm();

  constructor(
    private stock: StockService,
    private obrasService: ObrasService
  ) {
    addIcons({ addOutline, calculatorOutline, refreshOutline, saveOutline, trashOutline });
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.load();
  }

  loadReferenceData(): void {
    this.obrasService.getAll().subscribe({ next: r => this.obras = r || [] });
    this.stock.getMaterials({ take: 500, ativo: true }).subscribe({ next: r => this.materials = r.items || [] });
  }

  load(): void {
    this.loading = true;
    this.stock.getBudgets({ take: 100, search: this.search }).subscribe({
      next: r => { this.budgets = r.items || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  addItem(): void {
    this.form.items.push({ materialId: '', quantidadeOrcada: '1', custoUnitarioOrcado: '0', etapaObra: '' });
  }

  removeItem(index: number): void {
    if (this.form.items.length === 1) return;
    this.form.items.splice(index, 1);
  }

  save(): void {
    if (!this.isValid()) return;
    this.saving = true;
    this.stock.createBudget(this.form).subscribe({
      next: () => { this.form = this.emptyForm(); this.saving = false; this.load(); },
      error: () => this.saving = false
    });
  }

  itemTotal(item: any): number {
    return Number(item.quantidadeOrcada || 0) * Number(item.custoUnitarioOrcado || 0);
  }

  isValid(): boolean {
    return !!this.form.obraId && !!this.form.dataReferencia && this.form.items.every(item => item.materialId && Number(item.quantidadeOrcada) > 0 && Number(item.custoUnitarioOrcado) >= 0);
  }

  private emptyForm(): StockBudgetPayload {
    return {
      obraId: '',
      dataReferencia: new Date().toISOString().slice(0, 10),
      observacao: '',
      items: [{ materialId: '', quantidadeOrcada: '1', custoUnitarioOrcado: '0', etapaObra: '' }]
    };
  }
}
