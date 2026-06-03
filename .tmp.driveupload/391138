import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterLink } from '@angular/router';
import { ClientsService, Cliente, ClientExecutiveDTO } from '../../services/clients/clients';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonSearchbar, IonCard, IonCardContent, IonButton, AlertController, IonRippleEffect, IonChip, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trashOutline, chevronForwardOutline, searchOutline, callOutline, createOutline, documentTextOutline, alertCircleOutline, caretDownOutline, statsChartOutline, cloudUploadOutline, downloadOutline, ellipsisVertical, cloudDownloadOutline, warningOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { ImportModalComponent } from '../../shared/components/import-modal/import-modal.component';

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
  activeFilter: 'ALL' | 'RISK' | 'TOP_REVENUE' | 'OLD' | 'DEFAULTERS' | 'ARCHIVED' = 'ALL';
  sortBy: 'REVENUE' | 'HEALTH' | 'OLD' | 'NEW' = 'REVENUE';
  searchTerm: string = '';
  isImporting: boolean = false;

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
    private alertController: AlertController,
    private modalCtrl: ModalController
  ) {
    addIcons({ add, trashOutline, chevronForwardOutline, searchOutline, callOutline, createOutline, documentTextOutline, alertCircleOutline, caretDownOutline, statsChartOutline, cloudUploadOutline, downloadOutline, ellipsisVertical, cloudDownloadOutline, warningOutline, checkmarkCircleOutline });
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
    this.insights.riskCount = this.clients.filter(c => c.healthScore === 'RISK').length;
    const totalRevenue = this.clients.reduce((sum, c) => sum + c.revenue, 0);
    const top3Revenue = this.clients.slice(0, 3).reduce((sum, c) => sum + c.revenue, 0);
    this.insights.topConcentration = totalRevenue > 0 ? (top3Revenue / totalRevenue) * 100 : 0;
  }

  applyFilters(event?: any) {
    if (event?.target?.value !== undefined) {
      this.searchTerm = event.target.value.toLowerCase();
    }

    let result = [...this.clients];

    // Search
    if (this.searchTerm) {
      result = result.filter(c =>
        c.razaoSocial.toLowerCase().includes(this.searchTerm) ||
        (c.cnpj && c.cnpj.includes(this.searchTerm)) ||
        (c.cpf && c.cpf.includes(this.searchTerm)) ||
        (c.financeiroNome && c.financeiroNome.toLowerCase().includes(this.searchTerm))
      );
    }

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
      case 'ARCHIVED':
        result = result.filter(c => c.ativo === false);
        break;
      default:
        // By default, only show active clients for any other filter (ALL, RISK, etc.)
        result = result.filter(c => c.ativo !== false);
        break;
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

  async openImportModal() {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: {
        title: 'Importar Clientes',
        endpointUrl: 'clients/import'
      },
      cssClass: 'import-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadData();
      }
    });

    await modal.present();
  }

  exportCSV() {
    const headers = [
      'Razão Social', 'Documento', 'Financeiro Contato', 'Email Financeiro',
      'Valor Acordado', 'Plano', 'Data Início', 'Data Fim', 'Health Score', 'Status'
    ];

    const rows = this.filteredClients.map(c => {
      return [
        `"${c.razaoSocial || ''}"`,
        `"${c.cnpj || c.cpf || ''}"`,
        `"${c.financeiroNome || ''}"`,
        `"${c.financeiroEmail || ''}"`,
        c.revenue || 0,
        c.planType ? `"${c.planType}"` : '""',
        c.dataInicio ? `"${new Date(c.dataInicio).toISOString().split('T')[0]}"` : '',
        c.dataTermino ? `"${new Date(c.dataTermino).toISOString().split('T')[0]}"` : '',
        `"${c.healthScore || ''}"`,
        `"${c.statusDisplay || ''}"`
      ].join(',');
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
