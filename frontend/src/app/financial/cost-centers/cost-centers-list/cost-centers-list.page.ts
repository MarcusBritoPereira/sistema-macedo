import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, businessOutline, chevronForwardOutline, add, cloudUploadOutline } from 'ionicons/icons';
import { CostCentersService, CostCenter } from '../../../services/financial/cost-centers.service';
import { RouterModule } from '@angular/router';
import { ImportModalComponent } from '../../../shared/components/import-modal/import-modal.component';

@Component({
  selector: 'app-cost-centers-list',
  templateUrl: './cost-centers-list.page.html',
  styleUrls: ['./cost-centers-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent]
})
export class CostCentersListPage implements OnInit {
  costCenters: CostCenter[] = [];

  constructor(
    private costCentersService: CostCentersService,
    private modalCtrl: ModalController
  ) {
    addIcons({ searchOutline, businessOutline, chevronForwardOutline, add, cloudUploadOutline });
  }

  ngOnInit() {
    this.loadCostCenters();
  }

  loadCostCenters(event?: any) {
    this.costCentersService.findAll().subscribe({
      next: (data) => {
        this.costCenters = data;
        if (event) event.target.complete();
      },
      error: (error) => {
        console.error('Error loading cost centers', error);
        if (event) event.target.complete();
      }
    });
  }

  async openImportModal() {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: {
        title: 'Importar Centros de Custo',
        endpointUrl: 'financial/cost-centers/import'
      },
      cssClass: 'import-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadCostCenters();
      }
    });

    await modal.present();
  }
}
