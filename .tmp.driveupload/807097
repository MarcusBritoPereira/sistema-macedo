import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, archiveOutline, barChartOutline, businessOutline, cubeOutline, listOutline, swapHorizontalOutline, trendingDownOutline } from 'ionicons/icons';
import { StockBalance, StockService, StockSummary } from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DecimalPipe, IonButton, IonContent, IonIcon, IonSpinner],
  templateUrl: './stock-dashboard.page.html',
  styleUrls: ['./stock-dashboard.page.scss']
})
export class StockDashboardPage implements OnInit {
  loading = true;
  summary?: StockSummary;
  lowStock: StockBalance[] = [];

  constructor(private stock: StockService) {
    addIcons({ alertCircleOutline, archiveOutline, barChartOutline, businessOutline, cubeOutline, listOutline, swapHorizontalOutline, trendingDownOutline });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.stock.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.stock.getLowStock({ take: 6 }).subscribe({
          next: (result) => {
            this.lowStock = result.items || [];
            this.loading = false;
          },
          error: () => (this.loading = false)
        });
      },
      error: () => (this.loading = false)
    });
  }
}
