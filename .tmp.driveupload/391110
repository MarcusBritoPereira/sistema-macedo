import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { RateioLancamento } from '../../../services/financial/rateio';
import { DreService } from '../../../services/financial/dre.service';
import { FinancialService, Transaction } from '../../../services/financial/financial';

@Component({
  selector: 'app-rateio-modal',
  templateUrl: './rateio-modal.component.html',
  styleUrls: ['./rateio-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class RateioModalComponent implements OnInit {
  @Input() transaction!: Transaction;
  
  rateios: RateioLancamento[] = [];
  categories: any[] = [];
  
  totalRateado = 0;
  diferenca = 0;
  
  classificacoesDRE = [
    { value: 'RECEITA_RECORRENTE', label: 'Receita Recorrente' },
    { value: 'RECEITA_NAO_RECORRENTE', label: 'Receita não recorrente' },
    { value: 'DEDUCOES_RECEITA', label: 'Deduções' },
    { value: 'CUSTO_SERVICOS_PRESTADOS', label: 'Custo de Serviços' },
    { value: 'DESPESA_ADMINISTRATIVA', label: 'Despesa Administrativa' },
    { value: 'DESPESA_COMERCIAL', label: 'Despesa Comercial' },
    { value: 'DESPESA_ESTRUTURAL', label: 'Despesa com Estrutura' },
    { value: 'DESPESA_SOCIOS', label: 'Despesa com Sócios' },
    { value: 'DESPESA_FINANCEIRA', label: 'Despesa Financeira' },
    { value: 'RECEITA_FINANCEIRA', label: 'Receita Financeira' },
    { value: 'IMPOSTOS_LUCRO', label: 'Impostos sobre Lucro' },
    { value: 'OUTROS', label: 'Outros' }
  ];

  constructor(
    private modalCtrl: ModalController,
    private dreService: DreService,
    private financialService: FinancialService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    // Carregar categorias existentes no sistema para o autocomplete/select
    this.financialService.getCategories().subscribe(cats => {
      this.categories = cats;
    });

    // Carregar rateios do lançamento
    if (this.transaction.id) {
      this.dreService.getRateios(this.transaction.id).subscribe(rateios => {
        this.rateios = rateios;
        if (this.rateios.length === 0) {
          this.adicionarRateioPadrao();
        }
        this.calcularTotais();
      });
    }
  }

  adicionarRateioPadrao() {
    this.rateios.push({
      valor: this.transaction.valor,
      categoria: 'OUTROS',
      recorrente: this.transaction.habilitarRateio || false,
      subcategoria: '',
      categoriaFinanceiraId: this.transaction.categoriaId
    });
  }

  adicionarRateio() {
    this.rateios.push({
      valor: 0,
      categoria: 'OUTROS',
      recorrente: false,
      subcategoria: ''
    });
    this.calcularTotais();
  }

  removerRateio(index: number) {
    this.rateios.splice(index, 1);
    this.calcularTotais();
  }

  calcularTotais() {
    this.totalRateado = this.rateios.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
    this.diferenca = Number(this.transaction.valor) - this.totalRateado;
  }

  async salvar() {
    this.calcularTotais();
    if (Math.abs(this.diferenca) > 0.01) {
      const toast = await this.toastCtrl.create({
        message: `A soma dos rateios deve ser igual a R$ ${this.transaction.valor.toFixed(2)}. Diferença atual: R$ ${this.diferenca.toFixed(2)}`,
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
      return;
    }

    if (this.transaction.id) {
      this.dreService.saveRateios(this.transaction.id, this.rateios).subscribe(async res => {
        const toast = await this.toastCtrl.create({
          message: 'Rateios salvos com sucesso!',
          duration: 2000,
          color: 'success'
        });
        toast.present();
        this.modalCtrl.dismiss(this.rateios);
      }, async err => {
        const toast = await this.toastCtrl.create({
          message: err.error?.message || 'Erro ao salvar rateios',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      });
    }
  }

  cancelar() {
    this.modalCtrl.dismiss();
  }

  ajustarDiferenca(index: number) {
    this.rateios[index].valor += this.diferenca;
    this.calcularTotais();
  }
}
