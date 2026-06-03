import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { DreService } from '../../../../services/financial/dre.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dre-drilldown-modal',
  templateUrl: './dre-drilldown-modal.component.html',
  styleUrls: ['./dre-drilldown-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class DreDrilldownModalComponent implements OnInit {
  @Input() categoria!: string;
  @Input() subcategoria?: string;
  @Input() dataInicio!: string;
  @Input() dataFim!: string;
  @Input() regime!: string;

  lancamentos: any[] = [];
  loading = true;

  constructor(
    private modalCtrl: ModalController,
    private dreService: DreService,
    private router: Router
  ) {}

  ngOnInit() {
    this.carregarDetalhes();
  }

  carregarDetalhes() {
    this.loading = true;
    this.dreService.obterDetalhes({
      categoria: this.categoria,
      subcategoria: this.subcategoria,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      regime: this.regime
    }).subscribe({
      next: (res) => {
        this.lancamentos = res || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes', err);
        this.loading = false;
      }
    });
  }

  fechar() {
    this.modalCtrl.dismiss();
  }

  editarLancamento(id: string) {
    this.modalCtrl.dismiss();
    // Assuming we don't have the exact ID in details, wait, the details endpoint needs to return the lancamentoId!
    if (id) {
      this.router.navigate(['/financial/detail', id], { queryParams: { action: 'rateio' } });
    }
  }
}
