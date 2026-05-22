import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-import-modal',
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ImportModalComponent {
  @Input() title: string = 'Importar Dados';
  @Input() endpointUrl: string = '';
  
  selectedFile: File | null = null;
  loading: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {}

  dismiss(result?: any) {
    this.modalCtrl.dismiss(result);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      this.selectedFile = file;
    } else {
      this.showToast('Por favor, selecione um arquivo CSV válido.', 'warning');
      this.selectedFile = null;
    }
  }

  downloadTemplate() {
    const templateUrl = this.endpointUrl.replace('import', 'template/csv');
    window.open(`${environment.apiUrl}/${templateUrl}`, '_blank');
  }

  async upload() {
    if (!this.selectedFile) return;

    this.loading = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    try {
      const response: any = await this.http.post(`${environment.apiUrl}/${this.endpointUrl}`, formData).toPromise();
      this.loading = false;
      const importedCount = response.imported ?? response.created ?? response.count ?? 0;
      this.showToast(`Importação concluída! ${importedCount} registros foram importados.`, 'success');
      this.dismiss(true);
    } catch (error) {
      this.loading = false;
      console.error(error);
      this.showToast('Erro ao importar o arquivo. Verifique se o formato está correto.', 'danger');
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
