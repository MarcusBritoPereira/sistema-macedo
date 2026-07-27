import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonIcon, IonSearchbar, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barChartOutline, refreshOutline } from 'ionicons/icons';
import { StockBalance, StockService } from '../../services/stock/stock.service';

@Component({ selector: 'app-stock-balances', standalone: true, imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, IonButton, IonContent, IonIcon, IonSearchbar, IonSelect, IonSelectOption, IonSpinner], templateUrl: './stock-balances.page.html', styleUrls: ['./stock-balances.page.scss'] })
export class StockBalancesPage implements OnInit {
  loading = true; search = ''; situacao = ''; balances: StockBalance[] = [];
  situations = ['', 'NORMAL', 'BAIXO', 'CRITICO', 'ZERADO', 'NEGATIVO'];
  constructor(private stock: StockService) { addIcons({ barChartOutline, refreshOutline }); }
  ngOnInit(): void { this.load(); }
  load(): void { this.loading = true; const params: any = { take: 100, search: this.search }; if (this.situacao) params.situacao = this.situacao; this.stock.getBalances(params).subscribe({ next: r => { this.balances = r.items || []; this.loading = false; }, error: () => this.loading = false }); }
}
