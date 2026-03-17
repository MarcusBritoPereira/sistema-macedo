import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { saveOutline, trashOutline, arrowBackOutline } from 'ionicons/icons';
import { SuppliersService, Supplier } from '../../services/suppliers/suppliers.service';
import { CategoriesService, Category } from '../../services/financial/categories.service';

@Component({
    selector: 'app-supplier-detail',
    templateUrl: './supplier-detail.page.html',
    styleUrls: ['./supplier-detail.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RouterModule]
})
export class SupplierDetailPage implements OnInit {
    supplierForm: FormGroup;
    isEditMode = false;
    supplierId: string | null = null;
    categories: Category[] = [];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private suppliersService: SuppliersService,
        private categoriesService: CategoriesService,
        private toastCtrl: ToastController,
        private alertCtrl: AlertController
    ) {
        addIcons({ saveOutline, trashOutline, arrowBackOutline });
        this.supplierForm = this.fb.group({
            nomeFantasia: ['', [Validators.required]],
            razaoSocial: [''],
            cnpj: [''],
            email: ['', [Validators.email]],
            telefone: [''],
            categoriaDefaultId: [''],
            ativo: [true]
        });
    }

    ngOnInit() {
        this.loadCategories();
        this.supplierId = this.route.snapshot.paramMap.get('id');
        if (this.supplierId && this.supplierId !== 'new') {
            this.isEditMode = true;
            this.loadSupplier(this.supplierId);
        }
    }

    loadCategories() {
        this.categoriesService.findAll().subscribe(cats => {
            // Filter only expenses? Usually suppliers are for expenses.
            this.categories = cats.filter(c => c.tipo === 'DESPESA');
        });
    }

    loadSupplier(id: string) {
        this.suppliersService.getById(id).subscribe(data => {
            this.supplierForm.patchValue(data);
        });
    }

    async onSave() {
        if (this.supplierForm.invalid) {
            this.supplierForm.markAllAsTouched();
            return;
        }

        const supplier = this.supplierForm.value;

        if (this.isEditMode && this.supplierId) {
            this.suppliersService.update(this.supplierId, supplier).subscribe({
                next: () => {
                    this.showToast('Fornecedor atualizado!');
                    this.router.navigate(['/suppliers']);
                },
                error: (err) => this.showToast(this.getErrorMessage(err, 'Não foi possível atualizar o fornecedor.'), 'danger')
            });
        } else {
            this.suppliersService.create(supplier).subscribe({
                next: () => {
                    this.showToast('Fornecedor criado!');
                    this.router.navigate(['/suppliers']);
                },
                error: (err) => this.showToast(this.getErrorMessage(err, 'Não foi possível criar o fornecedor.'), 'danger')
            });
        }
    }

    async onDelete() {
        const alert = await this.alertCtrl.create({
            header: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir?',
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Excluir',
                    handler: () => {
                        if (this.supplierId) {
                            this.suppliersService.delete(this.supplierId).subscribe({
                                next: () => {
                                    this.showToast('Fornecedor excluído.');
                                    this.router.navigate(['/suppliers']);
                                },
                                error: (err) => {
                                    console.error(err);
                                    this.showToast(this.getErrorMessage(err, 'Não foi possível excluir o fornecedor. Verifique vínculos ativos.'), 'danger')
                                }
                            });
                        }
                    }
                }
            ]
        });
        await alert.present();
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
    private getErrorMessage(err: any, fallback: string): string {
        const message = err?.error?.message;

        if (Array.isArray(message)) {
            return message.join(' | ');
        }

        if (typeof message === 'string' && message.trim()) {
            return message;
        }

        return fallback;
    }
}

