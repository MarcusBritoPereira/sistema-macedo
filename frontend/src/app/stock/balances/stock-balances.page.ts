import {
  CommonModule,
  CurrencyPipe,
  DecimalPipe,
} from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  barChartOutline,
  cashOutline,
  cubeOutline,
  layersOutline,
  refreshOutline,
  searchOutline,
  swapHorizontalOutline,
  timeOutline,
} from 'ionicons/icons';

import {
  StockBalance,
  StockCategory,
  StockLocation,
  StockService,
  StockSummary,
} from '../../services/stock/stock.service';

import {
  Obra,
  ObrasService,
} from '../../services/financial/obras.service';

type SituationFilter =
  | ''
  | 'NORMAL'
  | 'REPOSICAO'
  | 'BAIXO'
  | 'ZERADO'
  | 'NEGATIVO';

type AvailabilityFilter =
  | 'ALL'
  | 'WITH_STOCK'
  | 'EMPTY'
  | 'RESERVED';

@Component({
  selector: 'app-stock-balances',
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
  templateUrl: './stock-balances.page.html',
  styleUrls: ['./stock-balances.page.scss'],
})
export class StockBalancesPage implements OnInit {
  loading = true;

  search = '';
  situationFilter: SituationFilter = '';
  categoryFilter = '';
  locationFilter = '';
  obraFilter = '';
  availabilityFilter: AvailabilityFilter = 'ALL';

  balances: StockBalance[] = [];
  filteredBalances: StockBalance[] = [];

  categories: StockCategory[] = [];
  locations: StockLocation[] = [];
  obras: Obra[] = [];

  summary: StockSummary = {
    valorTotalEstoque: 0,
    quantidadeFisica: 0,
    quantidadeReservada: 0,
    quantidadeDisponivel: 0,
    materiaisCadastrados: 0,
    materiaisAbaixoMinimo: 0,
  };

  constructor(
    private readonly stock: StockService,
    private readonly obrasService: ObrasService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastController: ToastController,
  ) {
    addIcons({
      alertCircleOutline,
      barChartOutline,
      cashOutline,
      cubeOutline,
      layersOutline,
      refreshOutline,
      searchOutline,
      swapHorizontalOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.locationFilter =
        params.get('localEstoqueId') || '';

      this.categoryFilter =
        params.get('categoriaMaterialId') || '';

      this.obraFilter =
        params.get('obraId') || '';

      this.load();
    });

    this.loadAuxiliaryData();
  }

  load(): void {
    this.loading = true;

    const params: any = {
      take: 1000,
    };

    if (this.locationFilter) {
      params.localEstoqueId = this.locationFilter;
    }

    if (this.categoryFilter) {
      params.categoriaMaterialId = this.categoryFilter;
    }

    if (this.obraFilter) {
      params.obraId = this.obraFilter;
    }

    this.stock.getBalances(params).subscribe({
      next: (response) => {
        this.balances = response.items || [];
        this.applyFilters();
        this.loading = false;
      },
      error: async () => {
        this.balances = [];
        this.filteredBalances = [];
        this.loading = false;

        await this.showToast(
          'Não foi possível carregar os saldos.',
          'danger',
        );
      },
    });

    this.stock.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
      },
    });
  }

  loadAuxiliaryData(): void {
    this.stock
      .getCategories({ take: 500, ativo: true })
      .subscribe({
        next: (response) => {
          this.categories = response.items || [];
        },
      });

    this.stock
      .getLocations({ take: 500, ativo: true })
      .subscribe({
        next: (response) => {
          this.locations = response.items || [];
        },
      });

    this.obrasService.getAll().subscribe({
      next: (obras) => {
        this.obras = obras || [];
      },
    });
  }

  applyFilters(): void {
    const term = this.normalize(this.search);

    this.filteredBalances = this.balances.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.material?.codigo,
          item.material?.nome,
          item.material?.marca,
          item.material?.categoriaMaterial?.nome,
          item.localEstoque?.codigo,
          item.localEstoque?.nome,
          item.localEstoque?.obra?.nome,
        ].some((value) =>
          this.normalize(value).includes(term),
        );

      const matchesSituation =
        !this.situationFilter ||
        item.situacao === this.situationFilter;

      const matchesCategory =
        !this.categoryFilter ||
        item.material?.categoriaMaterialId ===
          this.categoryFilter;

      const matchesLocation =
        !this.locationFilter ||
        item.localEstoqueId === this.locationFilter;

      const matchesObra =
        !this.obraFilter ||
        item.localEstoque?.obraId === this.obraFilter ||
        item.localEstoque?.obra?.id === this.obraFilter;

      const physical = this.toNumber(item.quantidade);
      const reserved = this.toNumber(
        item.quantidadeReservada,
      );

      const matchesAvailability =
        this.availabilityFilter === 'ALL' ||
        (this.availabilityFilter === 'WITH_STOCK' &&
          physical !== 0) ||
        (this.availabilityFilter === 'EMPTY' &&
          physical === 0) ||
        (this.availabilityFilter === 'RESERVED' &&
          reserved > 0);

      return (
        matchesSearch &&
        matchesSituation &&
        matchesCategory &&
        matchesLocation &&
        matchesObra &&
        matchesAvailability
      );
    });
  }

  clearFilters(): void {
    this.search = '';
    this.situationFilter = '';
    this.categoryFilter = '';
    this.locationFilter = '';
    this.obraFilter = '';
    this.availabilityFilter = 'ALL';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });

    this.load();
  }

  get totalAvailable(): number {
    if (
      this.summary.quantidadeDisponivel !== undefined
    ) {
      return this.toNumber(
        this.summary.quantidadeDisponivel,
      );
    }

    return (
      this.toNumber(this.summary.quantidadeFisica) -
      this.toNumber(this.summary.quantidadeReservada)
    );
  }

  get criticalItems(): number {
    return this.filteredBalances.filter((item) =>
      ['BAIXO', 'ZERADO', 'NEGATIVO'].includes(
        item.situacao,
      ),
    ).length;
  }

  getSituationLabel(
    situation: StockBalance['situacao'],
  ): string {
    const labels: Record<string, string> = {
      NORMAL: 'Normal',
      REPOSICAO: 'Reposição',
      BAIXO: 'Estoque baixo',
      ZERADO: 'Zerado',
      NEGATIVO: 'Negativo',
    };

    return labels[situation] || situation;
  }

  getSituationClass(
    situation: StockBalance['situacao'],
  ): string {
    return `situation-${String(situation).toLowerCase()}`;
  }

  openMovements(item: StockBalance): void {
    if (!item.material?.id) return;

    this.router.navigate(['/stock/reports'], {
      queryParams: {
        type: 'movements',
        materialId: item.material.id,
        localEstoqueId: item.localEstoqueId,
      },
    });
  }

  openTransfer(item: StockBalance): void {
    this.router.navigate(['/stock/transfers'], {
      queryParams: {
        materialId: item.materialId,
        localOrigemId: item.localEstoqueId,
      },
    });
  }

  toNumber(
    value: string | number | null | undefined,
  ): number {
    const parsed = Number(value || 0);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  trackByBalance(
    _index: number,
    item: StockBalance,
  ): string {
    return item.id;
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private async showToast(
    message: string,
    color: string,
  ): Promise<void> {
    const toast =
      await this.toastController.create({
        message,
        color,
        duration: 2500,
        position: 'bottom',
      });

    await toast.present();
  }
}
