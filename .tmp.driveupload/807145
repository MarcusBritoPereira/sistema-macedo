import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, listOutline, refreshOutline } from 'ionicons/icons';
import { StockService } from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-request-detail',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, IonButton, IonContent, IonIcon, IonSpinner],
  templateUrl: './stock-request-detail.page.html',
  styleUrls: ['./stock-request-detail.page.scss']
})
export class StockRequestDetailPage implements OnInit {
  loading = true;
  id = '';
  request: any;

  constructor(private route: ActivatedRoute, private stock: StockService) {
    addIcons({ arrowBackOutline, listOutline, refreshOutline });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    if (!this.id) return;
    this.loading = true;
    this.stock.getRequest(this.id).subscribe({
      next: response => { this.request = response; this.loading = false; },
      error: () => this.loading = false
    });
  }
}
