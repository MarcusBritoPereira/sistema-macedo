import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterLink } from '@angular/router';
import { ClientsService, Cliente, ClientExecutiveDTO } from '../../services/clients/clients';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, IonSearchbar, IonCard, IonCardContent, IonButton, AlertController, IonRippleEffect, IonChip } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trashOutline, chevronForwardOutline, searchOutline, callOutline, createOutline, documentTextOutline, alertCircleOutline, caretDownOutline, statsChartOutline, heart, cloudUploadOutline, downloadOutline } from 'ionicons/icons';

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
  sortBy: 'REVENUE' | 'HEALTH' | 'OLD' | 'NEW' = 'REVENUE';
  searchTerm: string = '';

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
    addIcons({ add, trashOutline, chevronForwardOutline, searchOutline, callOutline, createOutline, documentTextOutline, alertCircleOutline, caretDownOutline, statsChartOutline, cloudUploadOutline, downloadOutline });
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
    if (event !== undefined) {
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

  // --- Bulk CSV Upload Logic ---

  downloadCsvTemplate() {
    const headers = [
      'Razao Social', 'Nome Fantasia', 'CNPJ', 'CPF', 'Email', 'Telefone',
      'Endereco', 'Representante Nome', 'Representante CPF', 'Financeiro Nome', 'Financeiro Email'
    ];
    const csvContent = headers.join(',') + '\n' +
      'Empresa Exemplo Ltda,Empresa Ex,12.345.678/0001-99,,contato@empresa.com,11999999999,Rua Exemplo 123,Joao Silva,123.456.789-00,Maria Fin,pagar@empresa.com';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modelo_importacao_clientes.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  triggerCsvUpload(event: Event) {
    // Hidden input click is handled by UI linking or ViewChild.
    // Here we assume the method is called by button to click input.
    // Actually in Angular/Ionic easier to just have the input hidden and click it from template ref
    // We will use ViewChild approach in bigger apps, but simple (click) on input via template ref is fine.
    // This method might not be needed if HTML handles the click relay.
  }

  onCsvSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      this.processCsvData(text);
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  }

  processCsvData(csvText: string) {
    const lines = csvText.split('\n');
    const clients: Cliente[] = [];
    // Skip header row
    const startIndex = 1;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV split (note: breaks on commas inside quotes)
      // For a robust solution, use a regex or lib. For MVP: simple split.
      const cols = line.split(',');

      // Mapping based on headers index
      // 'Razao Social', 'Nome Fantasia', 'CNPJ', 'CPF', 'Email', 'Telefone',
      // 'Endereco', 'Representante Nome', 'Representante CPF', 'Financeiro Nome', 'Financeiro Email'

      if (cols.length < 1) continue;

      const client: Cliente = {
        razaoSocial: cols[0]?.trim() || 'Sem Razão Social',
        nomeFantasia: cols[1]?.trim(),
        cnpj: cols[2]?.trim(),
        cpf: cols[3]?.trim(),
        email: cols[4]?.trim(),
        telefone: cols[5]?.trim(),
        endereco: cols[6]?.trim(),
        representanteNome: cols[7]?.trim(),
        representanteCpf: cols[8]?.trim(),
        financeiroNome: cols[9]?.trim(),
        financeiroEmail: cols[10]?.trim(),
        ativo: true
      };

      // Validate basic requirement
      if (client.razaoSocial) {
        clients.push(client);
      }
    }

    if (clients.length > 0) {
      this.uploadClients(clients);
    } else {
      this.alertController.create({
        header: 'Erro',
        message: 'Nenhum cliente válido encontrado no arquivo.',
        buttons: ['OK']
      }).then(a => a.present());
    }
  }

  async uploadClients(clients: Cliente[]) {
    // Show loading?
    console.log('Uploading', clients.length, 'clients');
    this.clientsService.createMany(clients).subscribe({
      next: async (res) => {
        const alert = await this.alertController.create({
          header: 'Sucesso',
          message: `${clients.length} clientes importados com sucesso!`,
          buttons: ['OK']
        });
        await alert.present();
        this.loadData();
      },
      error: async (err) => {
        console.error(err);
        const alert = await this.alertController.create({
          header: 'Erro',
          message: 'Falha ao importar clientes. Verifique o formato do arquivo.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }
}
