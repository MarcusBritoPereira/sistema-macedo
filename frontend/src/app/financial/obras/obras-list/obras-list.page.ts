import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController, ModalController } from '@ionic/angular';
import { ObrasService, Obra } from '../../../services/financial/obras.service';
import { ImportModalComponent } from '../../../shared/components/import-modal/import-modal.component';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, downloadOutline } from 'ionicons/icons';

@Component({
  selector: 'app-obras-list',
  templateUrl: './obras-list.page.html',
  styleUrls: ['./obras-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ObrasListPage implements OnInit {
  obras: Obra[] = [];
  loading = true;

  constructor(
    private obrasService: ObrasService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController
  ) {
    addIcons({ cloudUploadOutline, downloadOutline });
  }

  ngOnInit() {
    this.loadObras();
  }

  ionViewWillEnter() {
    this.loadObras();
  }

  loadObras(event?: any) {
    this.loading = !event;
    this.obrasService.getAll().subscribe({
      next: (data) => {
        this.obras = data;
        this.loading = false;
        if (event) event.target.complete();
      },
      error: async (err) => {
        console.error(err);
        await this.showToast('Erro ao carregar obras.', 'danger');
        this.loading = false;
        if (event) event.target.complete();
      }
    });
  }

  addObra() {
    this.navCtrl.navigateForward('/financial/obras/obra-detail/new');
  }

  editObra(obra: Obra) {
    this.navCtrl.navigateForward(`/financial/obras/obra-detail/${obra.id}`);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PLANEJAMENTO': return 'primary';
      case 'EM_ANDAMENTO': return 'secondary';
      case 'PAUSADA': return 'warning';
      case 'CONCLUIDA': return 'success';
      case 'CANCELADA': return 'danger';
      default: return 'medium';
    }
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  async openImportModal() {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: {
        title: 'Importar Obras',
        endpointUrl: 'financial/obras/import'
      },
      cssClass: 'import-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadObras();
      }
    });

    await modal.present();
  }

  exportCSV() {
    const csvRows = [];
    csvRows.push('ID,Nome,Status,DataInicio,OrcamentoPrevisto');
    
    this.obras.forEach(o => {
      const id = o.id || '';
      const nome = o.nome ? `"${o.nome.replace(/"/g, '""')}"` : '';
      const status = o.status || '';
      const dataInicio = o.dataInicio ? new Date(o.dataInicio).toLocaleDateString('pt-BR') : '';
      const orcamento = o.orcamentoPrevisto || 0;
      csvRows.push(`${id},${nome},${status},${dataInicio},${orcamento}`);
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "obras.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
