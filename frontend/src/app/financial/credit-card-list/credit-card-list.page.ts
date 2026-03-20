import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-credit-card-list',
  templateUrl: './credit-card-list.page.html',
  styleUrls: ['./credit-card-list.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class CreditCardListPage implements OnInit {
  faturas: any[] = [];

  constructor(
    private http: HttpClient,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.loadInvoices();
  }

  ionViewWillEnter() {
    this.loadInvoices();
  }

  async loadInvoices() {
    const loading = await this.loadingCtrl.create();
    await loading.present();
    this.http.get<any[]>(`${environment.apiUrl}/financial/credit-cards/invoices`).subscribe({
      next: async (res) => {
        this.faturas = res;
        await loading.dismiss();
      },
      error: async () => {
        await loading.dismiss();
      }
    });
  }

  async processCSV(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const loading = await this.loadingCtrl.create({ message: 'Importando e auto-classificando...' });
    await loading.present();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('cartaoId', 'default');

    this.http.post(`${environment.apiUrl}/financial/credit-cards/import`, formData).subscribe({
      next: async () => {
        await loading.dismiss();
        this.loadInvoices();
      },
      error: async () => {
        await loading.dismiss();
      }
    });
  }
}
