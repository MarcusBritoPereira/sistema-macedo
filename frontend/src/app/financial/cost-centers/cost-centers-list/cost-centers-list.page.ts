import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, businessOutline, chevronForwardOutline, add, cloudUploadOutline, downloadOutline } from 'ionicons/icons';
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
    addIcons({ searchOutline, businessOutline, chevronForwardOutline, add, cloudUploadOutline, downloadOutline });
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

  exportCSV() {
    const csvRows = [];
    csvRows.push('ID,Nome,Descricao');
    
    this.costCenters.forEach(cc => {
      const id = cc.id || '';
      const nome = cc.nome ? `"${cc.nome.replace(/"/g, '""')}"` : '';
      const desc = cc.descricao ? `"${cc.descricao.replace(/"/g, '""')}"` : '';
      csvRows.push(`${id},${nome},${desc}`);
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "centros_de_custo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
