import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ParcelaObra, ObrasService } from '../../../../services/financial/obras.service';

@Component({
  selector: 'app-parcelas-table',
  templateUrl: './parcelas-table.component.html',
  styleUrls: ['./parcelas-table.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ParcelasTableComponent implements OnInit {
  @Input() obraId!: string;
  @Input() orcamentoPrevisto: number = 0;
  @Input() parcelas: ParcelaObra[] = [];
  
  @Output() parcelasChanged = new EventEmitter<void>();

  constructor(
    private alertCtrl: AlertController,
    private obrasService: ObrasService
  ) {}

  ngOnInit() {}

  get totalPorcentagem(): number {
    return this.parcelas.reduce((acc, p) => acc + (Number(p.porcentagem) || 0), 0);
  }

  get totalValor(): number {
    return this.parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  }

  async openGenerator() {
    const alert = await this.alertCtrl.create({
      header: 'Gerador de Parcelas',
      subHeader: `Orçamento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.orcamentoPrevisto)}`,
      inputs: [
        {
          name: 'quantidade',
          type: 'number',
          placeholder: 'Quantidade de parcelas',
          min: 1,
          max: 120
        },
        {
          name: 'dataInicio',
          type: 'date',
          placeholder: 'Data da 1ª Parcela (Entrada)',
          label: 'Data da 1ª Parcela'
        },
        {
          name: 'intervalo',
          type: 'number',
          placeholder: 'Intervalo (dias)',
          value: 30
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Gerar',
          handler: (data) => {
            if (!data.quantidade || !data.dataInicio) return false;
            this.generateParcelas(Number(data.quantidade), data.dataInicio, Number(data.intervalo || 30));
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async generateParcelas(qtd: number, dataInicioStr: string, intervaloDias: number) {
    if (!this.orcamentoPrevisto) {
      const alert = await this.alertCtrl.create({
        header: 'Aviso',
        message: 'A obra não possui um Orçamento Previsto definido. Deseja prosseguir com parcelas de R$ 0,00?',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Sim', handler: () => this.executeGeneration(qtd, dataInicioStr, intervaloDias, 0) }
        ]
      });
      await alert.present();
      return;
    }
    this.executeGeneration(qtd, dataInicioStr, intervaloDias, this.orcamentoPrevisto);
  }

  private async executeGeneration(qtd: number, dataInicioStr: string, intervaloDias: number, valorTotal: number) {
    // Delete existing
    for (const p of this.parcelas) {
      if (p.id) {
        await this.obrasService.deleteParcela(this.obraId, p.id).toPromise();
      }
    }

    const valorParcela = valorTotal / qtd;
    const porcentagem = 100 / qtd;

    const dataBase = new Date(dataInicioStr + 'T12:00:00Z');

    for (let i = 0; i < qtd; i++) {
      const dataVencimento = new Date(dataBase.getTime());
      dataVencimento.setDate(dataVencimento.getDate() + (i * intervaloDias));
      
      let descricao = `Parcela ${i + 1}`;
      if (i === 0) descricao = `Entrada`;
      else descricao = `Após ${i * intervaloDias} dias`;

      const novaParcela = {
        obraId: this.obraId,
        porcentagem: Number(porcentagem.toFixed(2)),
        valor: Number(valorParcela.toFixed(2)),
        dataVencimento: dataVencimento.toISOString(),
        descricao: descricao,
        status: 'PREVISTO'
      };

      await this.obrasService.createParcela(this.obraId, novaParcela).toPromise();
    }

    this.parcelasChanged.emit();
  }

  async editParcela(parcela: ParcelaObra) {
    const alert = await this.alertCtrl.create({
      header: 'Editar Parcela',
      inputs: [
        {
          name: 'descricao',
          type: 'text',
          placeholder: 'Descrição (Ex: Entrada - 13/04)',
          value: parcela.descricao || ''
        },
        {
          name: 'porcentagem',
          type: 'number',
          placeholder: 'Percentual (%)',
          value: parcela.porcentagem || ''
        },
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Valor (R$)',
          value: parcela.valor || ''
        },
        {
          name: 'dataVencimento',
          type: 'date',
          value: parcela.dataVencimento ? parcela.dataVencimento.split('T')[0] : ''
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: async (data) => {
            const payload: Partial<ParcelaObra> = {
              descricao: data.descricao,
              porcentagem: data.porcentagem ? Number(data.porcentagem) : undefined,
              valor: data.valor ? Number(data.valor) : undefined,
              dataVencimento: data.dataVencimento ? new Date(data.dataVencimento + 'T12:00:00Z').toISOString() : undefined
            };

            try {
              await this.obrasService.updateParcela(this.obraId, parcela.id!, payload).toPromise();
              this.parcelasChanged.emit();
            } catch (err) {
              console.error(err);
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async removeParcela(parcela: ParcelaObra) {
    if(confirm('Tem certeza que deseja excluir esta parcela?')) {
      await this.obrasService.deleteParcela(this.obraId, parcela.id!).toPromise();
      this.parcelasChanged.emit();
    }
  }

  async addParcelaManual() {
    const alert = await this.alertCtrl.create({
      header: 'Nova Parcela',
      inputs: [
        {
          name: 'descricao',
          type: 'text',
          placeholder: 'Descrição (Ex: Entrada)',
        },
        {
          name: 'porcentagem',
          type: 'number',
          placeholder: 'Percentual (%)',
        },
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Valor (R$)',
        },
        {
          name: 'dataVencimento',
          type: 'date',
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Adicionar',
          handler: async (data) => {
            if (!data.valor || !data.dataVencimento) return false;
            const payload: Partial<ParcelaObra> = {
              obraId: this.obraId,
              descricao: data.descricao,
              porcentagem: data.porcentagem ? Number(data.porcentagem) : undefined,
              valor: data.valor ? Number(data.valor) : 0,
              dataVencimento: new Date(data.dataVencimento + 'T12:00:00Z').toISOString(),
              status: 'PREVISTO'
            };

            await this.obrasService.createParcela(this.obraId, payload).toPromise();
            this.parcelasChanged.emit();
            return true;
          }
        }
      ]
    });
    await alert.present();
  }
}
