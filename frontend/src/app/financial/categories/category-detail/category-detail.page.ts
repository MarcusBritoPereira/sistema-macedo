import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea, ToastController, LoadingController, IonList, AlertController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoriesService, Category, Subcategory } from '../../../services/financial/categories.service';
import { addIcons } from 'ionicons';
import { saveOutline, trashOutline, arrowBackOutline, listOutline, createOutline, addOutline } from 'ionicons/icons';

@Component({
    selector: 'app-category-detail',
    templateUrl: './category-detail.page.html',
    styleUrls: ['./category-detail.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea, IonList]
})
export class CategoryDetailPage implements OnInit {
    category: Category = {
        nome: '',
        tipo: 'DESPESA',
        descricao: ''
    };
    isNew = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private categoriesService: CategoriesService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private alertCtrl: AlertController
    ) {
        addIcons({ saveOutline, trashOutline, arrowBackOutline, listOutline, createOutline, addOutline });
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'new') {
            this.isNew = false;
            this.loadCategory(id);
        }
    }

    loadCategory(id: string) {
        this.categoriesService.findAll().subscribe(cats => {
            const found = cats.find(c => c.id === id);
            if (found) this.category = found;
        });
    }

    async save() {
        const loading = await this.loadingCtrl.create({ message: 'Salvando...' });
        await loading.present();

        if (this.isNew) {
            this.categoriesService.create(this.category).subscribe({
                next: async () => {
                    await loading.dismiss();
                    this.router.navigate(['/financial/categories']);
                    this.showToast('Categoria criada com sucesso!');
                },
                error: async (err) => {
                    await loading.dismiss();
                    console.error(err);
                    this.showToast('Erro ao criar categoria. Verifique os dados.', 'danger');
                }
            });
        } else {
            if (this.category.id) {
                this.categoriesService.update(this.category.id, this.category).subscribe({
                    next: async () => {
                        await loading.dismiss();
                        this.router.navigate(['/financial/categories']);
                        this.showToast('Categoria atualizada com sucesso!');
                    },
                    error: async (err) => {
                        await loading.dismiss();
                        console.error(err);
                        this.showToast('Erro ao atualizar categoria.', 'danger');
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
        if (this.category.id) {
            this.categoriesService.delete(this.category.id).subscribe(() => {
                this.router.navigate(['/financial/categories']);
            });
        }
    }

    // --- Subcategory Management ---

    async addSubcategory() {
        if (!this.category.id) return;

        const alert = await this.alertCtrl.create({
            header: 'Nova Subcategoria',
            inputs: [
                {
                    name: 'nome',
                    type: 'text',
                    placeholder: 'Nome da subcategoria'
                },
                {
                    name: 'descricao',
                    type: 'text',
                    placeholder: 'Breve descrição (opcional)'
                }
            ],
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Adicionar',
                    handler: (data) => {
                        if (data.nome && data.nome.trim() !== '') {
                            this.categoriesService.createSubcategory(this.category.id!, data.nome, data.descricao, this.category.tipo).subscribe({
                                next: () => this.loadCategory(this.category.id!),
                                error: (err) => {
                                    console.error(err);
                                    this.showToast('Erro ao criar subcategoria', 'danger');
                                }
                            });
                        }
                    }
                }
            ]
        });
        await alert.present();
    }

    async editSubcategory(sub: Subcategory) {
        const alert = await this.alertCtrl.create({
            header: 'Editar Subcategoria',
            inputs: [
                {
                    name: 'nome',
                    type: 'text',
                    value: sub.nome,
                    placeholder: 'Nome da subcategoria'
                },
                {
                    name: 'descricao',
                    type: 'text',
                    value: sub.descricao || '',
                    placeholder: 'Breve descrição (opcional)'
                }
            ],
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Salvar',
                    handler: (data) => {
                        if (data.nome && data.nome.trim() !== '') {
                            this.categoriesService.updateSubcategory(sub.id, data.nome, data.descricao).subscribe({
                                next: () => this.loadCategory(this.category.id!),
                                error: (err) => {
                                    console.error(err);
                                    this.showToast('Erro ao atualizar subcategoria', 'danger');
                                }
                            });
                        }
                    }
                }
            ]
        });
        await alert.present();
    }

    async deleteSubcategory(sub: Subcategory) {
        const alert = await this.alertCtrl.create({
            header: 'Excluir Subcategoria',
            message: `Deseja realmente excluir '${sub.nome}'?`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Excluir',
                    role: 'destructive',
                    handler: () => {
                        this.categoriesService.deleteSubcategory(sub.id).subscribe({
                            next: () => this.loadCategory(this.category.id!),
                            error: (err) => {
                                console.error(err);
                                this.showToast('Erro ao excluir subcategoria', 'danger');
                            }
                        });
                    }
                }
            ]
        });
        await alert.present();
    }
}
