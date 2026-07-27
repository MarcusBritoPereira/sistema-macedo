import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, documentTextOutline, refreshOutline } from 'ionicons/icons';
import { StockService } from '../../services/stock/stock.service';

type DocumentKind = 'entries' | 'issues' | 'transfers';

@Component({
  selector: 'app-stock-document-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, RouterLink, IonButton, IonContent, IonIcon, IonSpinner],
  templateUrl: './stock-document-detail.page.html',
  styleUrls: ['./stock-document-detail.page.scss']
})
export class StockDocumentDetailPage implements OnInit {
  loading = true;
  kind: DocumentKind = 'entries';
  id = '';
  document: any;

  constructor(private route: ActivatedRoute, private stock: StockService) {
    addIcons({ arrowBackOutline, documentTextOutline, refreshOutline });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.kind = data['kind'] || 'entries';
      this.id = this.route.snapshot.paramMap.get('id') || '';
      this.load();
    });
  }

  load(): void {
    if (!this.id) return;
    this.loading = true;
    this.stock.getDocument(this.kind, this.id).subscribe({
      next: response => { this.document = response; this.loading = false; },
      error: () => this.loading = false
    });
  }

  backLink(): string {
    return `/stock/${this.kind}`;
  }
}
