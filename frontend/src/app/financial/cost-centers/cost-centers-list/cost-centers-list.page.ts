import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, businessOutline, chevronForwardOutline, add } from 'ionicons/icons';
import { CostCentersService, CostCenter } from '../../../services/financial/cost-centers.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cost-centers-list',
  templateUrl: './cost-centers-list.page.html',
  styleUrls: ['./cost-centers-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent]
})
export class CostCentersListPage implements OnInit {
  costCenters: CostCenter[] = [];

  constructor(private costCentersService: CostCentersService) {
    addIcons({ searchOutline, businessOutline, chevronForwardOutline, add });
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
}
