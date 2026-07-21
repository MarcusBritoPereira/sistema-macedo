import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSpinner, IonTextarea, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, folderOpenOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { StockCategory, StockService } from '../../services/stock/stock.service';

@Component({ selector: 'app-stock-categories', standalone: true, imports: [CommonModule, FormsModule, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSpinner, IonTextarea, IonToggle], templateUrl: './stock-categories.page.html', styleUrls: ['./stock-categories.page.scss'] })
export class StockCategoriesPage implements OnInit {
  loading = true; saving = false; search = ''; categories: StockCategory[] = []; form: StockCategory = this.emptyForm();
  constructor(private stock: StockService) { addIcons({ addOutline, folderOpenOutline, refreshOutline, saveOutline }); }
  ngOnInit(): void { this.load(); }
  load(): void { this.loading = true; this.stock.getCategories({ take: 100, search: this.search }).subscribe({ next: r => { this.categories = r.items || []; this.loading = false; }, error: () => this.loading = false }); }
  save(): void { this.saving = true; const request = this.form.id ? this.stock.updateCategory(this.form.id, this.form) : this.stock.createCategory(this.form); request.subscribe({ next: () => { this.form = this.emptyForm(); this.saving = false; this.load(); }, error: () => this.saving = false }); }
  edit(item: StockCategory): void { this.form = { ...item }; }
  reset(): void { this.form = this.emptyForm(); }
  private emptyForm(): StockCategory { return { nome: '', descricao: '', ativo: true }; }
}
