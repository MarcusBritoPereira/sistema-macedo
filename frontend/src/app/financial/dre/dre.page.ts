import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ModalController } from '@ionic/angular';
import { DreService } from '../../services/financial/dre.service';
import { FinancialService, BankAccount } from '../../services/financial/financial';
import { CostCenter } from '../../services/financial/cost-centers.service';
import { DREParams, DREResult } from '../../services/financial/dre';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DreDrilldownModalComponent } from './components/dre-drilldown-modal/dre-drilldown-modal.component';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dre',
  templateUrl: './dre.page.html',
  styleUrls: ['./dre.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, DecimalPipe, DreDrilldownModalComponent]
})
export class DrePage implements OnInit {
  filters: DREParams = {
    regime: 'caixa',
    dataInicio: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd'),
    granularidade: 'mensal',
    incluirRateios: true,
    centroCustoId: '',
    contaBancariaId: ''
  };

  dreResult?: DREResult;
  loading = false;
  bankAccounts: BankAccount[] = [];
  costCenters: any[] = [];
  subcatCache: { [cat: string]: any[] } = {};
  
  charts: { [key: string]: Chart } = {};

  expandedBlocks: { [key: string]: boolean } = {
    'RECEITAS': true,
    'CUSTO_SERVICOS_PRESTADOS': true,
    'DESPESAS_OPERACIONAIS': false,
    'OUTROS': false
  };

  constructor(
    private dreService: DreService,
    private financialService: FinancialService,
    private modalCtrl: ModalController
  ) {
    const today = new Date();
    const startDate = subMonths(today, 6);
    const firstDay = startOfMonth(startDate);
    this.filters.dataInicio = format(firstDay, 'yyyy-MM-dd');
    this.filters.dataFim = format(today, 'yyyy-MM-dd');
  }

  ngOnInit() {
    this.carregarFiltros();
    this.gerarDRE();
  }

  carregarFiltros() {
    this.financialService.getBankAccounts().subscribe((accs: BankAccount[]) => this.bankAccounts = accs);
    this.financialService.getCostCenters().subscribe((ccs: any[]) => this.costCenters = ccs);
  }

  gerarDRE() {
    this.loading = true;
    
    // Clean empty strings for API
    const params = { ...this.filters };
    if (!params.centroCustoId) delete params.centroCustoId;
    if (!params.contaBancariaId) delete params.contaBancariaId;

    this.dreService.gerarDRE(params).subscribe({
      next: (res) => {
        this.dreResult = res;
        this.cacheSubcategorias();
        this.loading = false;
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => {
        console.error('Erro ao gerar DRE', err);
        this.loading = false;
      }
    });
  }

  renderCharts() {
    if (!this.dreResult) return;

    this.renderExpenseChart();
    this.renderEvolutionChart();
  }

  renderExpenseChart() {
    const ctx = document.getElementById('expenseChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts['expenses']) this.charts['expenses'].destroy();

    const categories = Object.keys(this.dreResult!.data).filter(cat => 
        cat.startsWith('DESPESA') || cat === 'CUSTO_SERVICOS_PRESTADOS'
    );
    
    const data = categories.map(cat => Number(this.dreResult!.data[cat].total) || 0);
    const labels = categories.map(cat => cat.replace(/_/g, ' '));

    this.charts['expenses'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0', '#f67019'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Distribuição de Despesas' }
        }
      }
    } as any);
  }

  renderEvolutionChart() {
    const ctx = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts['evolution']) this.charts['evolution'].destroy();

    const labels = this.dreResult!.periodos;
    const revenues = labels.map(p => Number(this.dreResult!.totais['receitaBruta'].periodos[p]) || 0);
    const profits = labels.map(p => Number(this.dreResult!.totais['resultadoLiquido'].periodos[p]) || 0);

    this.charts['evolution'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Receita Bruta',
            data: revenues,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1
          },
          {
            label: 'Resultado Líquido',
            data: profits,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Evolução Mensal' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    } as any);
  }

  toggleBlock(block: string) {
    this.expandedBlocks[block] = !this.expandedBlocks[block];
  }

  isNegative(val: number): boolean {
    return val < 0;
  }

  cacheSubcategorias() {
    this.subcatCache = {};
    if (!this.dreResult || !this.dreResult.data) return;
    
    for (const cat in this.dreResult.data) {
      if (this.dreResult.data[cat].subcategorias) {
        this.subcatCache[cat] = Object.entries(this.dreResult.data[cat].subcategorias)
          .sort((a: any, b: any) => b[1].total - a[1].total);
      }
    }
  }

  getSubcategorias(categoria: string) {
    return this.subcatCache[categoria] || [];
  }

  async abrirDetalhes(categoria: string, subcategoria?: string) {
    const modal = await this.modalCtrl.create({
      component: DreDrilldownModalComponent,
      componentProps: {
        categoria,
        subcategoria,
        dataInicio: this.filters.dataInicio,
        dataFim: this.filters.dataFim,
        regime: this.filters.regime
      }
    });
    await modal.present();
  }
}
