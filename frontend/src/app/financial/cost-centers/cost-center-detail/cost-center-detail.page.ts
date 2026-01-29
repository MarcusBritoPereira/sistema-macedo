import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput, IonTextarea, ToastController, LoadingController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { CostCentersService, CostCenter } from '../../../services/financial/cost-centers.service';
import { addIcons } from 'ionicons';
import { saveOutline, trashOutline, arrowBackOutline } from 'ionicons/icons';

@Component({
    selector: 'app-cost-center-detail',
    templateUrl: './cost-center-detail.page.html',
    styleUrls: ['./cost-center-detail.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput, IonTextarea]
})
export class CostCenterDetailPage implements OnInit {
    costCenter: CostCenter = {
        nome: '',
        codigo: '',
        descricao: ''
    };
    isNew = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private costCenterService: CostCentersService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController
    ) {
        addIcons({ saveOutline, trashOutline, arrowBackOutline });
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'new') {
            this.isNew = false;
            this.loadCostCenter(id);
        }
    }

    loadCostCenter(id: string) {
        this.costCenterService.findAll().subscribe(ccs => {
            // Simple find locally
            const found = ccs.find(c => c.id === id);
            if (found) this.costCenter = found;
        });
    }

    async save() {
        const loading = await this.loadingCtrl.create({ message: 'Salvando...' });
        await loading.present();

        if (this.isNew) {
            this.costCenterService.create(this.costCenter).subscribe({
                next: async () => {
                    await loading.dismiss();
                    this.router.navigate(['/financial/cost-centers']);
                    this.showToast('Centro de custo criado com sucesso!');
                },
                error: async (err) => {
                    await loading.dismiss();
                    console.error(err);
                    this.showToast('Erro ao criar centro de custo.', 'danger');
                }
            });
        } else {
            if (this.costCenter.id) {
                this.costCenterService.update(this.costCenter.id, this.costCenter).subscribe({
                    next: async () => {
                        await loading.dismiss();
                        this.router.navigate(['/financial/cost-centers']);
                        this.showToast('Centro de custo atualizado com sucesso!');
                    },
                    error: async (err) => {
                        await loading.dismiss();
                        console.error(err);
                        this.showToast('Erro ao atualizar.', 'danger');
                    }
                });
            }
        }
    }

    async showToast(msg: string, color: string = 'success') {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 2000,
            color: color,
            position: 'bottom'
        });
        toast.present();
    }

    delete() {
        if (this.costCenter.id) {
            this.costCenterService.delete(this.costCenter.id).subscribe(() => {
                this.router.navigate(['/financial/cost-centers']);
            });
        }
    }
}
