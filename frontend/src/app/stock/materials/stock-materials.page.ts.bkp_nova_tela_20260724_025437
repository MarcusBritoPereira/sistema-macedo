import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, cubeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { StockCategory, StockMaterial, StockService } from '../../services/stock/stock.service';

@Component({ selector: 'app-stock-materials', standalone: true, imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonToggle], templateUrl: './stock-materials.page.html', styleUrls: ['./stock-materials.page.scss'] })
export class StockMaterialsPage implements OnInit {
  loading = true;
  saving = false;
  search = '';
  materials: StockMaterial[] = [];
  categories: StockCategory[] = [];
  form: StockMaterial = this.emptyForm();
  units = ['UN', 'KG', 'G', 'T', 'M', 'M2', 'M3', 'L', 'ML', 'CX', 'PCT', 'SC', 'RL', 'BD', 'GL'];

  constructor(private stock: StockService) { addIcons({ addOutline, cubeOutline, refreshOutline, saveOutline }); }
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.stock.getCategories({ take: 200, ativo: true }).subscribe({ next: r => this.categories = r.items || [] });
    this.stock.getMaterials({ take: 100, search: this.search }).subscribe({ next: r => { this.materials = r.items || []; this.loading = false; }, error: () => this.loading = false });
  }

  save(): void {
    this.saving = true;
    const request = this.form.id ? this.stock.updateMaterial(this.form.id, this.form) : this.stock.createMaterial(this.form);
    request.subscribe({ next: () => { this.form = this.emptyForm(); this.saving = false; this.load(); }, error: () => this.saving = false });
  }

  edit(material: StockMaterial): void { this.form = { ...material, categoriaMaterialId: material.categoriaMaterialId || material.categoriaMaterial?.id || '' }; }
  reset(): void { this.form = this.emptyForm(); }

  private emptyForm(): StockMaterial {
    return { codigo: '', nome: '', categoriaMaterialId: '', unidade: 'UN', estoqueMinimo: '0', pontoReposicao: '0', permiteFracionado: false, ativo: true };
  }
}
