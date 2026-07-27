import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  clipboardOutline,
  closeOutline,
  refreshOutline
} from 'ionicons/icons';
import {
  StockInventory,
  StockLocation,
  StockService
} from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-inventories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    RouterLink,
    IonButton,
    IonContent,
    IonIcon,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea
  ],
  templateUrl: './stock-inventories.page.html',
  styleUrls: ['./stock-inventories.page.scss']
})
export class StockInventoriesPage implements OnInit {
  loading = true;
  saving = false;
  drawerOpen = false;
  errorMessage = '';

  search = '';
  statusFilter = '';
  locationFilter = '';

  inventories: StockInventory[] = [];
  locations: StockLocation[] = [];

  form = {
    localEstoqueId: '',
    observacao: ''
  };

  constructor(private stock: StockService) {
    addIcons({
      addOutline,
      clipboardOutline,
      closeOutline,
      refreshOutline
    });
  }

  ngOnInit(): void {
    this.loadLocations();
    this.load();
  }

  loadLocations(): void {
    this.stock.getLocations({
      take: 500,
      ativo: true
    }).subscribe({
      next: r => {
        this.locations = r.items || [];
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

    if (this.locationFilter) {
      params.localEstoqueId = this.locationFilter;
    }

    this.stock.getInventories(params).subscribe({
      next: r => {
        this.inventories = r.items || [];
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
    this.locationFilter = '';
    this.load();
  }

  openDrawer(): void {
    this.errorMessage = '';
    this.form = {
      localEstoqueId: '',
      observacao: ''
    };
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    if (this.saving) return;
    this.drawerOpen = false;
  }

  create(): void {
    if (!this.form.localEstoqueId) {
      this.errorMessage =
        'Selecione o local de estoque.';
      return;
    }

    this.errorMessage = '';
    this.saving = true;

    this.stock.createInventory({
      localEstoqueId: this.form.localEstoqueId,
      observacao:
        this.form.observacao.trim() || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.drawerOpen = false;
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível abrir o inventário.';
      }
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      ABERTO: 'Aberto',
      EM_CONTAGEM: 'Em contagem',
      PENDENTE_APROVACAO: 'Aguardando aprovação',
      APROVADO: 'Aprovado',
      FECHADO: 'Fechado',
      CANCELADO: 'Cancelado'
    };

    return labels[status] || status;
  }

  get totalInventories(): number {
    return this.inventories.length;
  }

  get inProgress(): number {
    return this.inventories.filter(i =>
      ['ABERTO', 'EM_CONTAGEM'].includes(i.status)
    ).length;
  }

  get pendingApproval(): number {
    return this.inventories.filter(
      i => i.status === 'PENDENTE_APROVACAO'
    ).length;
  }

  get closed(): number {
    return this.inventories.filter(
      i => i.status === 'FECHADO'
    ).length;
  }
}
