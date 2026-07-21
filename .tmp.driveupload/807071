import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSpinner, IonTextarea } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, clipboardOutline, lockClosedOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { StockInventory, StockService } from '../../services/stock/stock.service';

interface CountFormItem {
  materialId: string;
  codigo: string;
  nome: string;
  quantidadeSistema: string | number;
  quantidadeContada: string | number;
  diferenca: string | number;
  valorDiferenca: string | number;
  justificativa?: string | null;
}

@Component({
  selector: 'app-stock-inventory-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe, RouterLink, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSpinner, IonTextarea],
  templateUrl: './stock-inventory-detail.page.html',
  styleUrls: ['./stock-inventory-detail.page.scss']
})
export class StockInventoryDetailPage implements OnInit {
  id = '';
  loading = true;
  saving = false;
  inventory?: StockInventory;
  items: CountFormItem[] = [];

  constructor(private route: ActivatedRoute, private stock: StockService) {
    addIcons({ checkmarkCircleOutline, clipboardOutline, lockClosedOutline, refreshOutline, saveOutline });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.stock.getInventory(this.id).subscribe({
      next: inventory => {
        this.inventory = inventory;
        this.items = (inventory.itens || []).map(item => ({
          materialId: item.materialId,
          codigo: item.material?.codigo || '',
          nome: item.material?.nome || '',
          quantidadeSistema: item.quantidadeSistema,
          quantidadeContada: item.quantidadeContada,
          diferenca: item.diferenca,
          valorDiferenca: item.valorDiferenca,
          justificativa: item.justificativa
        }));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  saveCount(): void {
    this.saving = true;
    this.stock.countInventory(this.id, {
      items: this.items.map(item => ({
        materialId: item.materialId,
        quantidadeContada: item.quantidadeContada,
        justificativa: item.justificativa
      }))
    }).subscribe({ next: () => { this.saving = false; this.load(); }, error: () => this.saving = false });
  }

  approve(): void {
    this.saving = true;
    this.stock.approveInventory(this.id).subscribe({ next: () => { this.saving = false; this.load(); }, error: () => this.saving = false });
  }

  close(): void {
    this.saving = true;
    this.stock.closeInventory(this.id).subscribe({ next: () => { this.saving = false; this.load(); }, error: () => this.saving = false });
  }

  canCount(): boolean {
    return this.inventory?.status === 'ABERTO' || this.inventory?.status === 'EM_CONTAGEM';
  }
}
