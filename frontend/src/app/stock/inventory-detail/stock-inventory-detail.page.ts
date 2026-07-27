import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTextarea
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  clipboardOutline,
  lockClosedOutline,
  refreshOutline,
  saveOutline,
  sendOutline
} from 'ionicons/icons';
import {
  StockInventory,
  StockService
} from '../../services/stock/stock.service';

interface CountFormItem {
  materialId: string;
  codigo: string;
  nome: string;
  unidade: string;
  quantidadeSistema: number;
  quantidadeContada: number;
  custoMedio: number;
  justificativa: string;
  contado: boolean;
  dirty: boolean;
}

@Component({
  selector: 'app-stock-inventory-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSpinner,
    IonTextarea
  ],
  templateUrl: './stock-inventory-detail.page.html',
  styleUrls: ['./stock-inventory-detail.page.scss']
})
export class StockInventoryDetailPage implements OnInit {
  id = '';
  loading = true;
  saving = false;
  errorMessage = '';

  inventory?: StockInventory;
  items: CountFormItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private stock: StockService,
    private alertCtrl: AlertController
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      clipboardOutline,
      lockClosedOutline,
      refreshOutline,
      saveOutline,
      sendOutline
    });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.stock.getInventory(this.id).subscribe({
      next: inventory => {
        this.inventory = inventory;

        this.items = (inventory.itens || []).map(item => ({
          materialId: item.materialId,
          codigo: item.material?.codigo || '',
          nome: item.material?.nome || '',
          unidade: item.material?.unidade || '',
          quantidadeSistema: Number(item.quantidadeSistema || 0),
          quantidadeContada: Number(item.quantidadeContada || 0),
          custoMedio: Number(item.custoMedio || 0),
          justificativa: item.justificativa || '',
          contado: !!item.contado,
          dirty: false
        }));

        this.loading = false;
      },
      error: err => {
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível carregar o inventário.';
        this.loading = false;
      }
    });
  }

  markDirty(item: CountFormItem): void {
    item.dirty = true;
  }

  confirmSystemQuantity(item: CountFormItem): void {
    if (!this.canCount()) return;

    item.quantidadeContada = item.quantidadeSistema;
    item.dirty = true;
  }

  difference(item: CountFormItem): number {
    return (
      Number(item.quantidadeContada || 0) -
      Number(item.quantidadeSistema || 0)
    );
  }

  valueDifference(item: CountFormItem): number {
    return this.difference(item) * Number(item.custoMedio || 0);
  }

  isLocallyCounted(item: CountFormItem): boolean {
    return item.contado || item.dirty;
  }

  get totalItems(): number {
    return this.items.length;
  }

  get countedItems(): number {
    return this.items.filter(item =>
      this.isLocallyCounted(item)
    ).length;
  }

  get pendingItems(): number {
    return this.totalItems - this.countedItems;
  }

  get divergentItems(): number {
    return this.items.filter(
      item =>
        this.isLocallyCounted(item) &&
        Math.abs(this.difference(item)) > 0.000001
    ).length;
  }

  get positiveImpact(): number {
    return this.items.reduce((total, item) => {
      const value = this.valueDifference(item);
      return total + (value > 0 ? value : 0);
    }, 0);
  }

  get negativeImpact(): number {
    return this.items.reduce((total, item) => {
      const value = this.valueDifference(item);
      return total + (value < 0 ? Math.abs(value) : 0);
    }, 0);
  }

  get dirtyItems(): CountFormItem[] {
    return this.items.filter(item => item.dirty);
  }

  get progress(): number {
    if (!this.totalItems) return 0;
    return Math.round(
      (this.countedItems / this.totalItems) * 100
    );
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      ABERTO: 'Aberto',
      EM_CONTAGEM: 'Em contagem',
      PENDENTE_APROVACAO: 'Aguardando aprovação',
      APROVADO: 'Aprovado',
      FECHADO: 'Fechado',
      CANCELADO: 'Cancelado'
    };

    return status ? labels[status] || status : '-';
  }

  saveCount(): void {
    const changed = this.dirtyItems;

    if (!changed.length) {
      this.errorMessage =
        'Nenhum item foi alterado ou conferido.';
      return;
    }

    const invalid = changed.find(
      item =>
        !Number.isFinite(Number(item.quantidadeContada)) ||
        Number(item.quantidadeContada) < 0
    );

    if (invalid) {
      this.errorMessage =
        `Quantidade inválida no material ${invalid.codigo}.`;
      return;
    }

    const missingJustification = changed.find(
      item =>
        Math.abs(this.difference(item)) > 0.000001 &&
        !item.justificativa.trim()
    );

    if (missingJustification) {
      this.errorMessage =
        `Informe a justificativa da divergência do material ${missingJustification.codigo}.`;
      return;
    }

    this.errorMessage = '';
    this.saving = true;

    this.stock.countInventory(this.id, {
      items: changed.map(item => ({
        materialId: item.materialId,
        quantidadeContada:
          String(item.quantidadeContada),
        justificativa:
          item.justificativa.trim() || undefined
      }))
    }).subscribe({
      next: () => {
        this.saving = false;
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível salvar a contagem.';
      }
    });
  }

  submit(): void {
    if (!this.inventory) return;

    if (this.dirtyItems.length) {
      this.errorMessage =
        'Existem alterações ainda não salvas.';
      return;
    }

    this.errorMessage = '';
    this.saving = true;

    this.stock.submitInventory(this.id).subscribe({
      next: () => {
        this.saving = false;
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível enviar para aprovação.';
      }
    });
  }

  approve(): void {
    this.errorMessage = '';
    this.saving = true;

    this.stock.approveInventory(this.id).subscribe({
      next: () => {
        this.saving = false;
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível aprovar o inventário.';
      }
    });
  }

  async close(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Fechar inventário',
      message:
        'O fechamento irá gerar os ajustes de entrada e saída no estoque conforme as divergências aprovadas. Esta operação altera o saldo físico.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Fechar e ajustar',
          role: 'confirm',
          handler: () => this.executeClose()
        }
      ]
    });

    await alert.present();
  }

  private executeClose(): void {
    this.errorMessage = '';
    this.saving = true;

    this.stock.closeInventory(this.id).subscribe({
      next: () => {
        this.saving = false;
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          'Não foi possível fechar o inventário.';
      }
    });
  }

  canCount(): boolean {
    return (
      this.inventory?.status === 'ABERTO' ||
      this.inventory?.status === 'EM_CONTAGEM'
    );
  }

  canSubmit(): boolean {
    return (
      this.inventory?.status === 'EM_CONTAGEM' &&
      this.pendingItems === 0 &&
      !this.dirtyItems.length
    );
  }
}
