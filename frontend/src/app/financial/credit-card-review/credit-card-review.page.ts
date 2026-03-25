import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
// Emulating a CreditCardService for frontend
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoriesService } from '../../services/financial/categories.service';

@Component({
  selector: 'app-credit-card-review',
  templateUrl: './credit-card-review.page.html',
  styleUrls: ['./credit-card-review.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class CreditCardReviewPage implements OnInit {
  faturaId: string | null = null;
  transacoes: any[] = [];
  categorias: any[] = [];

  // Metrics
  summary = {
    total: 0,
    classified: 0,
    pending: 0,
    value: 0
  };

  // Selection
  selectedIds: Set<string> = new Set();
  
  // Bulk Edit Option
  bulkCategoriaId: string = '';
  
  // Modal for linking (placeholder for now)
  isLinking: boolean = false;
  selectedTx: any = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private categoriesService: CategoriesService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private router: Router
  ) {}

  ngOnInit() {
    this.faturaId = this.route.snapshot.paramMap.get('id');
    this.categoriesService.findAll().subscribe((cats: any[]) => {
      this.categorias = cats.filter((c: any) => c.tipo === 'DESPESA'); // Credit cards usually expenses
    });
    if (this.faturaId) {
      this.loadTransactions();
    }
  }

  loadTransactions() {
    this.http.get<any[]>(`${environment.apiUrl}/financial/credit-cards/invoices/${this.faturaId}/transactions`).subscribe({
      next: (res: any[]) => {
        this.transacoes = res;
        this.updateSummary();
      },
      error: (err) => {
        console.error('Error loading transactions', err);
        this.showToast('Erro ao carregar transações.', 'danger');
      }
    });
  }

  updateSummary() {
    this.summary.total = this.transacoes.length;
    this.summary.classified = this.transacoes.filter((t: any) => t.categoriaId).length;
    this.summary.pending = this.summary.total - this.summary.classified;
    this.summary.value = this.transacoes.reduce((acc: number, t: any) => acc + (t.valor || 0), 0);
  }

  openLinking(tx: any) {
    this.selectedTx = tx;
    this.isLinking = true;
    // In a real app, this would open a modal to select a LancamentoFinanceiro
    this.showToast('Funcionalidade de Vincular em desenvolvimento...', 'primary');
  }

  async linkTransaction(entryId: string) {
    if (!this.selectedTx) return;
    this.http.post(`${environment.apiUrl}/financial/credit-cards/transactions/${this.selectedTx.id}/link`, { entryId }).subscribe({
      next: () => {
        this.showToast('Transação vinculada com sucesso.');
        this.loadTransactions();
        this.isLinking = false;
      },
      error: () => this.showToast('Erro ao vincular transação.', 'danger')
    });
  }

  toggleSelection(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  get allSelected(): boolean {
    return this.transacoes.length > 0 && Array.from(this.selectedIds).length === this.transacoes.length;
  }

  toggleAll() {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      this.transacoes.forEach(t => this.selectedIds.add(t.id));
    }
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  async applyAutoRules() {
    const loading = await this.loadingCtrl.create({ message: 'Aplicando regras...' });
    await loading.present();

    const ids = Array.from(this.selectedIds).length ? Array.from(this.selectedIds) : this.transacoes.filter((t: any) => !t.categoriaId).map((t: any) => t.id);
    
    this.http.post(`${environment.apiUrl}/financial/credit-cards/rules/learn`, { transactionsIds: ids }).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        this.showToast(`${res.classified} itens classificados automaticamente.`);
        this.loadTransactions();
        this.selectedIds.clear();
      },
      error: async () => {
        await loading.dismiss();
        this.showToast('Erro ao aplicar regras.', 'danger');
      }
    });
  }

  async applyBulkCategory() {
    if (!this.bulkCategoriaId || this.selectedIds.size === 0) return;

    const loading = await this.loadingCtrl.create({ message: 'Aplicando lote...' });
    await loading.present();

    this.http.put(`${environment.apiUrl}/financial/credit-cards/transactions/classify-batch`, {
      ids: Array.from(this.selectedIds),
      categoriaId: this.bulkCategoriaId
    }).subscribe({
      next: async () => {
        await loading.dismiss();
        this.showToast('Lote atualizado com sucesso.');
        this.loadTransactions();
        this.selectedIds.clear();
        this.bulkCategoriaId = '';
      },
      error: async () => {
        await loading.dismiss();
        this.showToast('Erro ao atualizar lote.', 'danger');
      }
    });
  }

  async onCategoryChange(tx: any, event: any) {
    const newCatId = event.detail.value;
    
    const loading = await this.loadingCtrl.create({ message: 'Salvando...' });
    await loading.present();

    this.http.put(`${environment.apiUrl}/financial/credit-cards/transactions/classify-batch`, {
      ids: [tx.id],
      categoriaId: newCatId
    }).subscribe({
      next: async () => {
        await loading.dismiss();
        tx.categoriaId = newCatId;
      },
      error: async () => {
        await loading.dismiss();
        this.showToast('Erro ao salvar item.', 'danger');
      }
    });
  }

  async showToast(msg: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}
