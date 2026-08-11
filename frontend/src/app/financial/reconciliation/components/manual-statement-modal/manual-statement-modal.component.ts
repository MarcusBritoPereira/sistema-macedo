import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { format } from 'date-fns';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  selector: 'app-manual-statement-modal',
  templateUrl: './manual-statement-modal.component.html',
  styleUrls: ['./manual-statement-modal.component.scss'],
})
export class ManualStatementModalComponent implements OnInit {

  data: string = format(new Date(), 'yyyy-MM-dd');
  descricao: string = '';
  valor: string = '';
  tipo: 'CREDIT' | 'DEBIT' = 'CREDIT';

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {}

  cancel() {
    this.modalCtrl.dismiss();
  }

  formatCurrency(event: any) {
    let input = event.detail.value;
    if (!input) {
      this.valor = '';
      return;
    }
    
    // Remove all non-numeric characters
    let value = input.replace(/\D/g, '');
    
    if (value === '') {
      this.valor = '';
      return;
    }

    // Convert to number and divide by 100 to get decimal
    let numberValue = parseInt(value, 10) / 100;
    
    // Format back to string
    this.valor = numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getNumericValue(): number {
    if (!this.valor) return 0;
    // Remove dots (thousands) and replace comma with dot (decimal)
    const normalized = this.valor.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
  }

  save() {
    if (!this.descricao || !this.valor) {
      return;
    }
    
    const numValor = this.getNumericValue();
    if (isNaN(numValor) || numValor <= 0) {
      return;
    }

    this.modalCtrl.dismiss({
      data: this.data,
      descricao: this.descricao,
      valor: numValor,
      tipo: this.tipo
    }, 'confirm');
  }

  isValid() {
    const numValor = this.getNumericValue();
    const isValorValid = numValor > 0;
    const isDescricaoValid = this.descricao && this.descricao.trim().length > 0;
    return isDescricaoValid && isValorValid;
  }
}
