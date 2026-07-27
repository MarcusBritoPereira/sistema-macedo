import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  addOutline,
  businessOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  cubeOutline,
  layersOutline,
  locationOutline,
  refreshOutline,
  saveOutline,
  searchOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';

import {
  StockLocation,
  StockService,
} from '../../services/stock/stock.service';

import {
  Obra,
  ObrasService,
} from '../../services/financial/obras.service';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type StockFilter = 'ALL' | 'WITH_STOCK' | 'EMPTY';

@Component({
  selector: 'app-stock-locations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './stock-locations.page.html',
  styleUrls: ['./stock-locations.page.scss'],
})
export class StockLocationsPage implements OnInit {
  loading = true;
  saving = false;
  drawerOpen = false;

  search = '';
  typeFilter = '';
  obraFilter = '';
  statusFilter: StatusFilter = 'ALL';
  stockFilter: StockFilter = 'ALL';

  locations: StockLocation[] = [];
  filteredLocations: StockLocation[] = [];
  obras: Obra[] = [];

  form: StockLocation = this.emptyForm();

  readonly types = [
    'ESTOQUE_CENTRAL',
    'DEPOSITO',
    'ALMOXARIFADO',
    'OBRA',
    'CANTEIRO',
    'LOCAL_TEMPORARIO',
  ];

  constructor(
    private readonly stock: StockService,
    private readonly obrasService: ObrasService,
    private readonly toastController: ToastController,
    private readonly router: Router,
  ) {
    addIcons({
      addOutline,
      businessOutline,
      checkmarkCircleOutline,
      closeOutline,
      createOutline,
      cubeOutline,
      layersOutline,
      locationOutline,
      refreshOutline,
      saveOutline,
      searchOutline,
      trashOutline,
      warningOutline,
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadObras();
  }

  load(): void {
    this.loading = true;

    this.stock.getLocations({ take: 500 }).subscribe({
      next: (response) => {
        this.locations = response.items || [];
        this.applyFilters();
        this.loading = false;
      },
      error: async () => {
        this.locations = [];
        this.filteredLocations = [];
        this.loading = false;

        await this.showToast(
          'Não foi possível carregar os locais.',
          'danger',
        );
      },
    });
  }

  loadObras(): void {
    this.obrasService.getAll().subscribe({
      next: (obras) => {
        this.obras = (obras || []).filter(
          (obra) =>
            obra.ativo !== false &&
            obra.status !== 'CANCELADA' &&
            obra.status !== 'CONCLUIDA',
        );
      },
      error: () => {
        this.obras = [];
      },
    });
  }

  applyFilters(): void {
    const term = this.normalize(this.search);

    this.filteredLocations = this.locations.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.codigo,
          item.nome,
          item.endereco,
          item.obra?.nome,
          item.responsavel?.nome,
          this.getTypeLabel(item.tipo),
        ].some((value) => this.normalize(value).includes(term));

      const matchesType =
        !this.typeFilter || item.tipo === this.typeFilter;

      const matchesObra =
        !this.obraFilter || item.obraId === this.obraFilter;

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' && item.ativo !== false) ||
        (this.statusFilter === 'INACTIVE' && item.ativo === false);

      const saldo = this.toNumber(item.quantidadeFisica);

      const matchesStock =
        this.stockFilter === 'ALL' ||
        (this.stockFilter === 'WITH_STOCK' && saldo !== 0) ||
        (this.stockFilter === 'EMPTY' && saldo === 0);

      return (
        matchesSearch &&
        matchesType &&
        matchesObra &&
        matchesStatus &&
        matchesStock
      );
    });
  }

  clearFilters(): void {
    this.search = '';
    this.typeFilter = '';
    this.obraFilter = '';
    this.statusFilter = 'ALL';
    this.stockFilter = 'ALL';
    this.applyFilters();
  }

  openNew(): void {
    this.form = this.emptyForm();
    this.form.codigo = this.generateNextCode();
    this.drawerOpen = true;
  }

  edit(item: StockLocation): void {
    this.form = {
      ...item,
      obraId: item.obraId || item.obra?.id || null,
      responsavelId:
        item.responsavelId || item.responsavel?.id || null,
    };

    this.drawerOpen = true;
  }

  closeDrawer(): void {
    if (this.saving) return;

    this.drawerOpen = false;
    this.form = this.emptyForm();
  }

  save(): void {
    if (!this.form.codigo?.trim() || !this.form.nome?.trim()) {
      this.showToast(
        'Informe código e nome do local.',
        'warning',
      );
      return;
    }

    this.saving = true;

    const payload: StockLocation = {
      ...this.form,
      codigo: this.form.codigo.trim(),
      nome: this.form.nome.trim(),
      endereco: this.form.endereco?.trim() || null,
      obraId: this.form.obraId || null,
      responsavelId: this.form.responsavelId || null,
    };

    const request = payload.id
      ? this.stock.updateLocation(payload.id, payload)
      : this.stock.createLocation(payload);

    request.subscribe({
      next: async () => {
        const editing = Boolean(payload.id);

        this.saving = false;
        this.drawerOpen = false;
        this.form = this.emptyForm();

        await this.showToast(
          editing
            ? 'Local atualizado com sucesso.'
            : 'Local cadastrado com sucesso.',
          'success',
        );

        this.load();
      },
      error: async (error) => {
        this.saving = false;

        await this.showToast(
          error?.error?.message ||
            'Não foi possível salvar o local.',
          'danger',
        );
      },
    });
  }

  removeLocation(item: StockLocation): void {
    if (!item.id) return;

    const confirmed = window.confirm(
      `Deseja remover o local "${item.nome}"?\n\n` +
      'Quando houver movimentações, ele será apenas inativado.',
    );

    if (!confirmed) return;

    this.stock.deleteLocation(item.id).subscribe({
      next: async () => {
        await this.showToast(
          'Local removido ou inativado com sucesso.',
          'success',
        );

        this.load();
      },
      error: async (error) => {
        await this.showToast(
          error?.error?.message ||
            'Não foi possível remover o local.',
          'danger',
        );
      },
    });
  }

  openBalances(item: StockLocation): void {
    if (!item.id) return;

    this.router.navigate(['/stock/balances'], {
      queryParams: {
        localEstoqueId: item.id,
      },
    });
  }

  get totalLocations(): number {
    return this.locations.length;
  }

  get activeLocations(): number {
    return this.locations.filter(
      (item) => item.ativo !== false,
    ).length;
  }

  get locationsWithProject(): number {
    return this.locations.filter(
      (item) => Boolean(item.obraId || item.obra),
    ).length;
  }

  get totalStockValue(): number {
    return this.locations.reduce(
      (total, item) =>
        total + this.toNumber(item.valorTotalEstoque),
      0,
    );
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ESTOQUE_CENTRAL: 'Estoque central',
      DEPOSITO: 'Depósito',
      ALMOXARIFADO: 'Almoxarifado',
      OBRA: 'Estoque da obra',
      CANTEIRO: 'Canteiro',
      LOCAL_TEMPORARIO: 'Local temporário',
    };

    return labels[type] || type;
  }

  toNumber(value: string | number | null | undefined): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  trackByLocation(
    _index: number,
    item: StockLocation,
  ): string {
    return item.id || item.codigo;
  }

  private generateNextCode(): string {
    const highest = this.locations.reduce((max, item) => {
      const match = String(item.codigo || '').match(/(\d+)$/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0);

    return `LOC-${String(highest + 1).padStart(4, '0')}`;
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private emptyForm(): StockLocation {
    return {
      nome: '',
      codigo: '',
      tipo: 'DEPOSITO',
      obraId: null,
      responsavelId: null,
      endereco: '',
      permiteSaldoNegativo: false,
      ativo: true,
    };
  }

  private async showToast(
    message: string,
    color: string,
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
    });

    await toast.present();
  }
}
