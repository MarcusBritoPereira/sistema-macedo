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

  save() {
    if (!this.descricao || !this.valor) {
      return;
    }
    
    // Converte valor com virgula para numero se necessário
    const numValor = Number(this.valor.replace(',', '.'));
    if (isNaN(numValor) || numValor <= 0) {
      return; // Validation error handled silently, or could show toast
    }

    this.modalCtrl.dismiss({
      data: this.data,
      descricao: this.descricao,
      valor: numValor,
      tipo: this.tipo
    }, 'confirm');
  }

  isValid() {
    return this.descricao && this.descricao.length > 0 && this.valor && this.valor.length > 0;
  }
}
