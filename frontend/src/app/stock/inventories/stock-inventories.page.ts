import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { clipboardOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { StockInventory, StockLocation, StockService } from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-inventories',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea],
  templateUrl: './stock-inventories.page.html',
  styleUrls: ['./stock-inventories.page.scss']
})
export class StockInventoriesPage implements OnInit {
  loading = true;
  saving = false;
  search = '';
  inventories: StockInventory[] = [];
  locations: StockLocation[] = [];
  form = { localEstoqueId: '', observacao: '' };

  constructor(private stock: StockService) {
    addIcons({ clipboardOutline, refreshOutline, saveOutline });
  }

  ngOnInit(): void {
    this.loadLocations();
    this.load();
  }

  loadLocations(): void {
    this.stock.getLocations({ take: 500, ativo: true }).subscribe({ next: r => this.locations = r.items || [] });
  }

  load(): void {
    this.loading = true;
    this.stock.getInventories({ take: 100, search: this.search }).subscribe({
      next: r => { this.inventories = r.items || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  create(): void {
    if (!this.form.localEstoqueId) return;
    this.saving = true;
    this.stock.createInventory(this.form).subscribe({
      next: () => { this.form = { localEstoqueId: '', observacao: '' }; this.saving = false; this.load(); },
      error: () => this.saving = false
    });
  }
}
