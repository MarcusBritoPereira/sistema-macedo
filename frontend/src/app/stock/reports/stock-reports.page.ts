import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  barChartOutline,
  cartOutline,
  cloudDownloadOutline,
  cubeOutline,
  refreshOutline,
  swapHorizontalOutline,
  warningOutline
} from 'ionicons/icons';

import {
  Obra,
  ObrasService
} from '../../services/financial/obras.service';

import {
  StockCategory,
  StockLocation,
  StockMaterial,
  StockReportKind,
  StockService
} from '../../services/stock/stock.service';

interface ReportDefinition {
  value: StockReportKind;
  label: string;
  description: string;
  icon: string;
}

interface ReportColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'currency' | 'status' | 'abc';
}

@Component({
  selector: 'app-stock-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner
  ],
  templateUrl: './stock-reports.page.html',
  styleUrls: ['./stock-reports.page.scss']
})
export class StockReportsPage implements OnInit {
  loading = false;
  exporting = false;
  generated = false;
  errorMessage = '';

  kind: StockReportKind = 'position';

  dataInicio = '';
  dataFim = '';
  obraId = '';
  materialId = '';
  localEstoqueId = '';
  categoriaMaterialId = '';

  items: any[] = [];

  obras: Obra[] = [];
  materials: StockMaterial[] = [];
  locations: StockLocation[] = [];
  categories: StockCategory[] = [];

  readonly reports: ReportDefinition[] = [
    {
      value: 'position',
      label: 'Posição de estoque',
      description: 'Saldo físico, reservado, disponível e valor por local.',
      icon: 'cube-outline'
    },
    {
      value: 'movements',
      label: 'Movimentações',
      description: 'Histórico completo de entradas, saídas e transferências.',
      icon: 'swap-horizontal-outline'
    },
    {
      value: 'consumption-by-project',
      label: 'Consumo por obra',
      description: 'Materiais consumidos e custos apropriados em cada obra.',
      icon: 'analytics-outline'
    },
    {
      value: 'losses',
      label: 'Perdas e desperdícios',
      description: 'Saídas classificadas como perda ou desperdício.',
      icon: 'warning-outline'
    },
    {
      value: 'abc',
      label: 'Curva ABC',
      description: 'Classificação dos materiais por participação no custo.',
      icon: 'bar-chart-outline'
    },
    {
      value: 'purchase-suggestion',
      label: 'Sugestão de compra',
      description: 'Reposição sugerida com base nos níveis de estoque.',
      icon: 'cart-outline'
    }
  ];

  constructor(
    private stock: StockService,
    private obrasService: ObrasService
  ) {
    addIcons({
      analyticsOutline,
      barChartOutline,
      cartOutline,
      cloudDownloadOutline,
      cubeOutline,
      refreshOutline,
      swapHorizontalOutline,
      warningOutline
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
  }

  loadReferenceData(): void {
    this.obrasService.getAll().subscribe({
      next: result => {
        this.obras = result || [];
      }
    });

    this.stock.getMaterials({
      take: 5000,
      ativo: true
    }).subscribe({
      next: result => {
        this.materials = result.items || [];
      }
    });

    this.stock.getLocations({
      take: 5000,
      ativo: true
    }).subscribe({
      next: result => {
        this.locations = result.items || [];
      }
    });

    this.stock.getCategories({
      take: 5000,
      ativo: true
    }).subscribe({
      next: result => {
        this.categories = result.items || [];
      }
    });
  }

  selectReport(kind: StockReportKind): void {
    if (this.kind === kind) return;

    this.kind = kind;
    this.items = [];
    this.generated = false;
    this.errorMessage = '';

    if (!this.usesPeriod) {
      this.dataInicio = '';
      this.dataFim = '';
    }

    if (!this.usesProject) {
      this.obraId = '';
    }

    if (!this.usesLocation) {
      this.localEstoqueId = '';
    }

    if (!this.usesCategory) {
      this.categoriaMaterialId = '';
    }
  }

  load(): void {
    this.loading = true;
    this.generated = true;
    this.errorMessage = '';

    this.stock
      .getReport(this.kind, this.params())
      .subscribe({
        next: response => {
          this.items = response.items || [];
          this.loading = false;
        },
        error: err => {
          this.items = [];
          this.loading = false;
          this.errorMessage =
            err?.error?.message ||
            'Não foi possível gerar o relatório.';
        }
      });
  }

  exportCsv(): void {
    this.exporting = true;
    this.errorMessage = '';

    this.stock.getReport(
      this.kind,
      {
        ...this.params(),
        formato: 'csv',
        take: 10000
      }
    ).subscribe({
      next: response => {
        const blob = new Blob(
          [response.content || ''],
          {
            type:
              response.mimeType ||
              'text/csv;charset=utf-8'
          }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download =
          response.filename ||
          `${this.kind}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(
          () => URL.revokeObjectURL(url),
          100
        );

        this.exporting = false;
      },
      error: err => {
        this.exporting = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível exportar o relatório.';
      }
    });
  }

  clearFilters(): void {
    this.dataInicio = '';
    this.dataFim = '';
    this.obraId = '';
    this.materialId = '';
    this.localEstoqueId = '';
    this.categoriaMaterialId = '';
  }

  get activeReport(): ReportDefinition {
    return (
      this.reports.find(
        report => report.value === this.kind
      ) || this.reports[0]
    );
  }

  get columns(): ReportColumn[] {
    const map: Record<
      StockReportKind,
      ReportColumn[]
    > = {
      position: [
        {
          key: 'materialCodigo',
          label: 'Código'
        },
        {
          key: 'material',
          label: 'Material'
        },
        {
          key: 'categoria',
          label: 'Categoria'
        },
        {
          key: 'local',
          label: 'Local'
        },
        {
          key: 'obra',
          label: 'Obra'
        },
        {
          key: 'quantidade',
          label: 'Físico',
          type: 'number'
        },
        {
          key: 'reservada',
          label: 'Reservado',
          type: 'number'
        },
        {
          key: 'disponivel',
          label: 'Disponível',
          type: 'number'
        },
        {
          key: 'custoMedio',
          label: 'Custo médio',
          type: 'currency'
        },
        {
          key: 'valorTotal',
          label: 'Valor total',
          type: 'currency'
        }
      ],

      movements: [
        {
          key: 'numero',
          label: 'Número'
        },
        {
          key: 'data',
          label: 'Data',
          type: 'date'
        },
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'status'
        },
        {
          key: 'status',
          label: 'Status',
          type: 'status'
        },
        {
          key: 'materialCodigo',
          label: 'Código'
        },
        {
          key: 'material',
          label: 'Material'
        },
        {
          key: 'origem',
          label: 'Origem'
        },
        {
          key: 'destino',
          label: 'Destino'
        },
        {
          key: 'obra',
          label: 'Obra'
        },
        {
          key: 'quantidade',
          label: 'Quantidade',
          type: 'number'
        },
        {
          key: 'custoTotal',
          label: 'Custo total',
          type: 'currency'
        },
        {
          key: 'usuario',
          label: 'Registrado por'
        }
      ],

      'consumption-by-project': [
        {
          key: 'obra',
          label: 'Obra'
        },
        {
          key: 'materialCodigo',
          label: 'Código'
        },
        {
          key: 'material',
          label: 'Material'
        },
        {
          key: 'centroCusto',
          label: 'Centro de custo'
        },
        {
          key: 'quantidadeConsumida',
          label: 'Quantidade consumida',
          type: 'number'
        },
        {
          key: 'custoTotal',
          label: 'Custo total',
          type: 'currency'
        }
      ],

      losses: [
        {
          key: 'numero',
          label: 'Número'
        },
        {
          key: 'data',
          label: 'Data',
          type: 'date'
        },
        {
          key: 'materialCodigo',
          label: 'Código'
        },
        {
          key: 'material',
          label: 'Material'
        },
        {
          key: 'origem',
          label: 'Local'
        },
        {
          key: 'obra',
          label: 'Obra'
        },
        {
          key: 'quantidade',
          label: 'Quantidade',
          type: 'number'
        },
        {
          key: 'custoTotal',
          label: 'Valor da perda',
          type: 'currency'
        },
        {
          key: 'usuario',
          label: 'Registrado por'
        }
      ],

      abc: [
        {
          key: 'posicao',
          label: 'Posição',
          type: 'number'
        },
        {
          key: 'materialCodigo',
          label: 'Código'
        },
        {
          key: 'material',
          label: 'Material'
        },
        {
          key: 'quantidadeConsumida',
          label: 'Quantidade consumida',
          type: 'number'
        },
        {
          key: 'custoTotal',
          label: 'Custo total',
          type: 'currency'
        },
        {
          key: 'percentual',
          label: 'Participação',
          type: 'number'
        },
        {
          key: 'percentualAcumulado',
          label: 'Acumulado',
          type: 'number'
        },
        {
          key: 'classe',
          label: 'Classe',
          type: 'abc'
        }
      ],

      'purchase-suggestion': [
        {
          key: 'materialCodigo',
          label: 'Código'
        },
        {
          key: 'material',
          label: 'Material'
        },
        {
          key: 'categoria',
          label: 'Categoria'
        },
        {
          key: 'local',
          label: 'Local'
        },
        {
          key: 'disponivel',
          label: 'Disponível',
          type: 'number'
        },
        {
          key: 'estoqueMinimo',
          label: 'Mínimo',
          type: 'number'
        },
        {
          key: 'pontoReposicao',
          label: 'Reposição',
          type: 'number'
        },
        {
          key: 'estoqueMaximo',
          label: 'Máximo',
          type: 'number'
        },
        {
          key: 'quantidadeSugerida',
          label: 'Comprar',
          type: 'number'
        },
        {
          key: 'custoEstimado',
          label: 'Custo estimado',
          type: 'currency'
        }
      ]
    };

    return map[this.kind];
  }

  get usesPeriod(): boolean {
    return [
      'movements',
      'consumption-by-project',
      'losses',
      'abc'
    ].includes(this.kind);
  }

  get usesProject(): boolean {
    return [
      'position',
      'movements',
      'consumption-by-project',
      'losses',
      'abc'
    ].includes(this.kind);
  }

  get usesLocation(): boolean {
    return [
      'position',
      'movements',
      'losses',
      'purchase-suggestion'
    ].includes(this.kind);
  }

  get usesCategory(): boolean {
    return [
      'position',
      'purchase-suggestion'
    ].includes(this.kind);
  }

  get totalRecords(): number {
    return this.items.length;
  }

  get totalValue(): number {
    const keyMap: Record<
      StockReportKind,
      string | null
    > = {
      position: 'valorTotal',
      movements: 'custoTotal',
      'consumption-by-project': 'custoTotal',
      losses: 'custoTotal',
      abc: 'custoTotal',
      'purchase-suggestion': 'custoEstimado'
    };

    const key = keyMap[this.kind];

    if (!key) return 0;

    return this.items.reduce(
      (sum, item) =>
        sum + Number(item[key] || 0),
      0
    );
  }

  get totalQuantity(): number {
    const keyMap: Record<
      StockReportKind,
      string | null
    > = {
      position: 'disponivel',
      movements: 'quantidade',
      'consumption-by-project':
        'quantidadeConsumida',
      losses: 'quantidade',
      abc: 'quantidadeConsumida',
      'purchase-suggestion':
        'quantidadeSugerida'
    };

    const key = keyMap[this.kind];

    if (!key) return 0;

    return this.items.reduce(
      (sum, item) =>
        sum + Number(item[key] || 0),
      0
    );
  }

  get thirdMetricLabel(): string {
    const labels: Record<
      StockReportKind,
      string
    > = {
      position: 'Reservado',
      movements: 'Obras envolvidas',
      'consumption-by-project': 'Obras',
      losses: 'Materiais afetados',
      abc: 'Classe A',
      'purchase-suggestion':
        'Materiais para comprar'
    };

    return labels[this.kind];
  }

  get thirdMetricValue(): number {
    switch (this.kind) {
      case 'position':
        return this.items.reduce(
          (sum, item) =>
            sum + Number(item.reservada || 0),
          0
        );

      case 'movements':
      case 'consumption-by-project':
        return new Set(
          this.items
            .map(item => item.obra)
            .filter(Boolean)
        ).size;

      case 'losses':
        return new Set(
          this.items
            .map(item => item.materialCodigo)
            .filter(Boolean)
        ).size;

      case 'abc':
        return this.items.filter(
          item => item.classe === 'A'
        ).length;

      case 'purchase-suggestion':
        return this.items.length;

      default:
        return 0;
    }
  }

  valueLabel(): string {
    const labels: Record<
      StockReportKind,
      string
    > = {
      position: 'Valor do estoque',
      movements: 'Valor movimentado',
      'consumption-by-project':
        'Custo consumido',
      losses: 'Valor das perdas',
      abc: 'Valor analisado',
      'purchase-suggestion':
        'Custo estimado'
    };

    return labels[this.kind];
  }

  quantityLabel(): string {
    const labels: Record<
      StockReportKind,
      string
    > = {
      position: 'Saldo disponível',
      movements: 'Quantidade movimentada',
      'consumption-by-project':
        'Quantidade consumida',
      losses: 'Quantidade perdida',
      abc: 'Quantidade consumida',
      'purchase-suggestion':
        'Quantidade sugerida'
    };

    return labels[this.kind];
  }

  formatValue(
    value: any,
    column: ReportColumn
  ): string {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL'
          }
        ).format(Number(value || 0));

      case 'number':
        if (
          column.key === 'percentual' ||
          column.key ===
            'percentualAcumulado'
        ) {
          return (
            new Intl.NumberFormat(
              'pt-BR',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }
            ).format(Number(value || 0)) +
            '%'
          );
        }

        return new Intl.NumberFormat(
          'pt-BR',
          {
            maximumFractionDigits: 3
          }
        ).format(Number(value || 0));

      case 'date':
        return new Intl.DateTimeFormat(
          'pt-BR',
          {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }
        ).format(new Date(value));

      case 'status':
        return this.humanize(value);

      default:
        return String(value);
    }
  }

  humanize(value: any): string {
    return String(value || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        letter => letter.toUpperCase()
      );
  }

  private params(): any {
    return {
      take: 100,
      ...(this.usesPeriod && this.dataInicio
        ? { dataInicio: this.dataInicio }
        : {}),
      ...(this.usesPeriod && this.dataFim
        ? { dataFim: this.dataFim }
        : {}),
      ...(this.usesProject && this.obraId
        ? { obraId: this.obraId }
        : {}),
      ...(this.materialId
        ? { materialId: this.materialId }
        : {}),
      ...(this.usesLocation &&
      this.localEstoqueId
        ? {
            localEstoqueId:
              this.localEstoqueId
          }
        : {}),
      ...(this.usesCategory &&
      this.categoriaMaterialId
        ? {
            categoriaMaterialId:
              this.categoriaMaterialId
          }
        : {})
    };
  }
}
