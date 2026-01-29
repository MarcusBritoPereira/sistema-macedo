import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterLink } from '@angular/router';
import { ClientsService, Cliente, ClientExecutiveDTO } from '../../services/clients/clients';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonSearchbar, IonCard, IonCardContent, IonButton, AlertController, IonRippleEffect, IonChip } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trashOutline, chevronForwardOutline, searchOutline, callOutline, createOutline, documentTextOutline, alertCircleOutline, caretDownOutline, statsChartOutline, heart } from 'ionicons/icons';

@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.page.html',
  styleUrls: ['./clients-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonSearchbar, IonCard, IonCardContent, IonButton, IonRippleEffect, IonChip]
})
export class ClientsListPage implements OnInit {
  clients: ClientExecutiveDTO[] = [];
  filteredClients: ClientExecutiveDTO[] = [];
  errorMessage: string | null = null;

  // Sort & Filter state
  activeFilter: 'ALL' | 'RISK' | 'TOP_REVENUE' | 'OLD' | 'DEFAULTERS' = 'ALL';
  sortBy: 'REVENUE' | 'HEALTH' | 'OLD' | 'NEW' = 'REVENUE'; // Default is now Revenue

  kpis = {
    activeClients: 0,
    churnCount: 0,
    avgLtv: 0,
    avgLifetimeMonths: 0
  };

  insights = {
    topConcentration: 0,
    riskCount: 0
  };

  constructor(
    private clientsService: ClientsService,
    private alertController: AlertController
  ) {
    addIcons({ add, trashOutline, chevronForwardOutline, searchOutline, callOutline, createOutline, documentTextOutline, alertCircleOutline, caretDownOutline });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData(event?: any) {
    this.loadKpis();
    this.loadExecutiveClients(event);
  }

  loadKpis() {
    this.clientsService.getKpis().subscribe({
      next: (data) => this.kpis = data,
      error: (err) => console.error('Erro ao carregar KPIs', err)
    });
  }

  loadExecutiveClients(event?: any) {
    this.clientsService.getExecutiveData().subscribe({
      next: (data) => {
        this.clients = data;
        this.calculateInsights();
        this.applyFilters();
        this.errorMessage = null;
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Erro ao carregar clientes.';
        if (event) event.target.complete();
      }
    });
  }

  calculateInsights() {
    // 1. Risk Count
    this.insights.riskCount = this.clients.filter(c => c.healthScore === 'RISK').length;

    // 2. Revenue Concentration (Top 3 %)
    const totalRevenue = this.clients.reduce((sum, c) => sum + c.revenue, 0);
    const top3Revenue = this.clients.slice(0, 3).reduce((sum, c) => sum + c.revenue, 0);
    this.insights.topConcentration = totalRevenue > 0 ? (top3Revenue / totalRevenue) * 100 : 0;
  }

  applyFilters() {
    let result = [...this.clients];

    // Filter
    switch (this.activeFilter) {
      case 'RISK':
        result = result.filter(c => c.healthScore === 'RISK' || c.healthScore === 'ATTENTION');
        break;
      case 'TOP_REVENUE':
        // Top 20%
        const revenueThreshold = 2000; // Arbitrary or percentile based
        result = result.filter(c => c.revenue >= revenueThreshold);
        break;
      case 'OLD':
        result = result.filter(c => c.durationMonths >= 12);
        break;
      // DEFAULTERS is same as RISK in our logic for now
    }

    // Sort
    switch (this.sortBy) {
      case 'REVENUE':
        result.sort((a, b) => b.revenue - a.revenue);
        break;
      case 'HEALTH':
        const scoreMap = { 'RISK': 0, 'ATTENTION': 1, 'GOOD': 2 };
        result.sort((a, b) => scoreMap[a.healthScore] - scoreMap[b.healthScore]);
        break;
      case 'OLD':
        result.sort((a, b) => b.durationMonths - a.durationMonths);
        break;
      case 'NEW':
        result.sort((a, b) => a.durationMonths - b.durationMonths);
        break;
    }

    this.filteredClients = result;
  }

  setFilter(filter: any) {
    this.activeFilter = filter;
    this.applyFilters();
  }

  // Helper actions
  openFinancial(client: ClientExecutiveDTO, event: Event) {
    event.stopPropagation();
    console.log('Open financial for', client.razaoSocial);
    // Router navigate to financial details
  }

  openContract(client: ClientExecutiveDTO, event: Event) {
    event.stopPropagation();
    console.log('Open contract for', client.razaoSocial);
  }

  async deleteClient(id: string, event: Event) {
    event.stopPropagation(); // Prevent card click (navigation)

    const alert = await this.alertController.create({
      header: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este cliente?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.clientsService.delete(id).subscribe(() => {
              this.loadData(); // Reload list
            });
          }
        }
      ]
    });

    await alert.present();
  }
}
