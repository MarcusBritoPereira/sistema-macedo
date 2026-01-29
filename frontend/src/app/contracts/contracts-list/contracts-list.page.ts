
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ContractsService, Contrato } from '../../services/contracts/contracts';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonBadge, IonSearchbar, IonCard, IonCardContent, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, documentText } from 'ionicons/icons';

@Component({
  selector: 'app-contracts-list',
  templateUrl: './contracts-list.page.html',
  styleUrls: ['./contracts-list.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonBadge, IonSearchbar, IonCard, IonCardContent, IonButton]
})
export class ContractsListPage implements OnInit {
  contracts: Contrato[] = [];

  constructor(private contractsService: ContractsService) {
    addIcons({ add, documentText });
  }

  ionViewWillEnter() {
    this.loadContracts();
  }

  ngOnInit() {
  }

  loadContracts(event?: any) {
    this.contractsService.findAll().subscribe({
      next: (data) => {
        this.contracts = data;
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error(err);
        if (event) event.target.complete();
      }
    });
  }
}
