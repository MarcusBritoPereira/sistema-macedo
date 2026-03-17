import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController } from '@ionic/angular';
import { DreService } from '../../services/financial/dre.service';
import { DREParams, DREResult } from '../../services/financial/dre';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

@Component({
  selector: 'app-dre',
  templateUrl: './dre.page.html',
  styleUrls: ['./dre.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, DecimalPipe]
})
export class DrePage implements OnInit {
  filters: DREParams = {
    regime: 'caixa',
    dataInicio: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd'),
    granularidade: 'mensal',
    incluirRateios: true
  };

  dreResult?: DREResult;
  loading = false;
  expandedBlocks: { [key: string]: boolean } = {
    'RECEITAS': true,
    'CUSTO_SERVICOS_PRESTADOS': true,
    'DESPESAS_OPERACIONAIS': false,
    'OUTROS': false
  };

  constructor(private dreService: DreService) {
    const today = new Date();
    // Default to 6 months back to show meaningful granularity (Monthly/Quarterly)
    const startDate = subMonths(today, 6);
    const firstDay = startOfMonth(startDate);
    this.filters.dataInicio = format(firstDay, 'yyyy-MM-dd');
    this.filters.dataFim = format(today, 'yyyy-MM-dd');
  }

  ngOnInit() {
    this.gerarDRE();
  }

  gerarDRE() {
    this.loading = true;
    this.dreService.gerarDRE(this.filters).subscribe({
      next: (res) => {
        this.dreResult = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao gerar DRE', err);
        this.loading = false;
      }
    });
  }

  toggleBlock(block: string) {
    this.expandedBlocks[block] = !this.expandedBlocks[block];
  }

  isNegative(val: number): boolean {
    return val < 0;
  }

  getSubcategorias(categoria: string) {
    if (!this.dreResult || !this.dreResult.data || !this.dreResult.data[categoria]) {
      return [];
    }
    // Retorna entradas ordenadas por valor total desc
    return Object.entries(this.dreResult.data[categoria].subcategorias)
      .sort((a: any, b: any) => b[1].total - a[1].total);
  }
}
