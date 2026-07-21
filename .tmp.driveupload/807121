import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, businessOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { StockLocation, StockService } from '../../services/stock/stock.service';

@Component({ selector: 'app-stock-locations', standalone: true, imports: [CommonModule, FormsModule, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonToggle], templateUrl: './stock-locations.page.html', styleUrls: ['./stock-locations.page.scss'] })
export class StockLocationsPage implements OnInit {
  loading = true; saving = false; search = ''; locations: StockLocation[] = []; form: StockLocation = this.emptyForm();
  types = ['ESTOQUE_CENTRAL', 'DEPOSITO', 'ALMOXARIFADO', 'OBRA', 'CANTEIRO', 'LOCAL_TEMPORARIO'];
  constructor(private stock: StockService) { addIcons({ addOutline, businessOutline, refreshOutline, saveOutline }); }
  ngOnInit(): void { this.load(); }
  load(): void { this.loading = true; this.stock.getLocations({ take: 100, search: this.search }).subscribe({ next: r => { this.locations = r.items || []; this.loading = false; }, error: () => this.loading = false }); }
  save(): void { this.saving = true; const request = this.form.id ? this.stock.updateLocation(this.form.id, this.form) : this.stock.createLocation(this.form); request.subscribe({ next: () => { this.form = this.emptyForm(); this.saving = false; this.load(); }, error: () => this.saving = false }); }
  edit(item: StockLocation): void { this.form = { ...item }; }
  reset(): void { this.form = this.emptyForm(); }
  private emptyForm(): StockLocation { return { nome: '', codigo: '', tipo: 'DEPOSITO', endereco: '', permiteSaldoNegativo: false, ativo: true }; }
}
