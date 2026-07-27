import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calculatorOutline, checkmarkCircleOutline, refreshOutline } from 'ionicons/icons';
import { StockActualVsBudget, StockBudget, StockService } from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-budget-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, IonButton, IonContent, IonIcon, IonSpinner],
  templateUrl: './stock-budget-detail.page.html',
  styleUrls: ['./stock-budget-detail.page.scss']
})
export class StockBudgetDetailPage implements OnInit {
  id = '';
  loading = true;
  saving = false;
  budget?: StockBudget;
  comparison?: StockActualVsBudget;

  constructor(private route: ActivatedRoute, private stock: StockService) {
    addIcons({ calculatorOutline, checkmarkCircleOutline, refreshOutline });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.stock.getBudget(this.id).subscribe({ next: b => this.budget = b });
    this.stock.getActualVsBudget(this.id).subscribe({
      next: comparison => { this.comparison = comparison; this.loading = false; },
      error: () => this.loading = false
    });
  }

  approve(): void {
    this.saving = true;
    this.stock.approveBudget(this.id).subscribe({ next: () => { this.saving = false; this.load(); }, error: () => this.saving = false });
  }
}
