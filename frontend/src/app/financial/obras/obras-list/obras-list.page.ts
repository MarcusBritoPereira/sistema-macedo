import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { ObrasService, Obra } from '../../../services/financial/obras.service';
import { ToastService } from '../../../services/toast.service';

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
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadObras();
  }

  ionViewWillEnter() {
    this.loadObras();
  }

  loadObras() {
    this.loading = true;
    this.obrasService.getAll().subscribe({
      next: (data) => {
        this.obras = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.toastService.showError('Erro ao carregar obras.');
        this.loading = false;
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
}
