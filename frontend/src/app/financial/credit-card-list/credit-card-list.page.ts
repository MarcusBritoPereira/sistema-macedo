import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
  IonContent, IonButton, IonIcon, IonBadge, IonGrid, IonRow, 
  IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, 
  IonCardContent, LoadingController, ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { syncOutline, cloudUploadOutline, cardOutline } from 'ionicons/icons';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-credit-card-list',
  templateUrl: './credit-card-list.page.html',
  styleUrls: ['./credit-card-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
    IonContent, IonButton, IonIcon, IonBadge, IonGrid, IonRow, 
    IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, 
    IonCardContent
  ]
})
export class CreditCardListPage implements OnInit {
  faturas: any[] = [];
  transactions: any[] = [];
  viewMode: 'FATURAS' | 'TRANSACTIONS' = 'FATURAS';
  
  constructor(
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ syncOutline, cloudUploadOutline, cardOutline });
  }

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  async loadData() {
    const loading = await this.loadingCtrl.create();
    await loading.present();

    this.http.get<any[]>(`${environment.apiUrl}/financial/credit-cards/invoices`).subscribe({
      next: (res: any[]) => {
        this.faturas = res;
        // No dismiss here, wait for all data to load
      },
      error: (err) => {
        console.error('Error loading invoices', err);
        // Handle error, maybe show a toast
      }
    });

    this.http.get<any[]>(`${environment.apiUrl}/financial/credit-cards/transactions`).subscribe({
      next: async (res: any[]) => {
        this.transactions = res;
        await loading.dismiss(); // Dismiss loading after all data is fetched
      },
      error: async (err) => {
        console.error('Error loading transactions', err);
        await loading.dismiss(); // Dismiss loading even if there's an error
      }
    });
  }

  setViewMode(mode: 'FATURAS' | 'TRANSACTIONS') {
    this.viewMode = mode;
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
        this.loadData();
      },
      error: async () => {
        await loading.dismiss();
      }
    });
  }

  async syncInter() {
    console.log('Sync Inter Clicked');
    const loading = await this.loadingCtrl.create({ message: 'Conectando ao Banco Inter e baixando transações...' });
    await loading.present();
    console.log('Loading presented');

    try {
      // 1. Find Inter account ID (Hardcoded for this user context as shared in psql output)
      const interContaId = 'c92621b6-06e0-422e-bb24-fb45be78879b';
      console.log('Calling sync API for account:', interContaId);
      
      this.http.post(`${environment.apiUrl}/financial/credit-cards/sync-inter/${interContaId}`, {}).subscribe({
        next: async (res: any) => {
          await loading.dismiss();
          const toast = await this.toastCtrl.create({
            message: res.message || 'Sincronização concluída com sucesso!',
            duration: 3000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.loadData();
        },
        error: async (err) => {
          await loading.dismiss();
          const toast = await this.toastCtrl.create({
            message: 'Erro na sincronização: ' + (err.error?.message || 'Erro desconhecido'),
            duration: 5000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
    } catch (e) {
      await loading.dismiss();
    }
  }
}
