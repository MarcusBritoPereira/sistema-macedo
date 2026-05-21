import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { add, searchOutline, downloadOutline, chevronForwardOutline, cloudUploadOutline } from 'ionicons/icons';
import { SuppliersService, Supplier } from '../../services/suppliers/suppliers.service';
import { ImportModalComponent } from '../../shared/components/import-modal/import-modal.component';

@Component({
    selector: 'app-suppliers-list',
    templateUrl: './suppliers-list.page.html',
    styleUrls: ['./suppliers-list.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class SuppliersListPage implements OnInit {
    suppliers: Supplier[] = [];
    filteredSuppliers: Supplier[] = [];
    searchTerm = '';

    constructor(
        private suppliersService: SuppliersService,
        private modalCtrl: ModalController
    ) {
        addIcons({ add, searchOutline, downloadOutline, chevronForwardOutline, cloudUploadOutline });
    }

    ngOnInit() {
        // Will load on ionViewWillEnter usually, but ngOnInit for now
        this.loadSuppliers();
    }

    ionViewWillEnter() {
        this.loadSuppliers();
    }

    loadSuppliers() {
        this.suppliersService.findAll().subscribe(data => {
            this.suppliers = data;
            this.filterSuppliers();
        });
    }

    filterSuppliers() {
        const term = this.searchTerm.toLowerCase();
        this.filteredSuppliers = this.suppliers.filter(s =>
            s.nomeFantasia.toLowerCase().includes(term) ||
            (s.razaoSocial && s.razaoSocial.toLowerCase().includes(term)) ||
            (s.cnpj && s.cnpj.includes(term))
        );
    }

    exportCSV() {
        const headers = ['Fornecedor', 'Razão Social', 'CNPJ', 'Email', 'Telefone'];

        const rows = this.filteredSuppliers.map(s => {
            return [
                `"${s.nomeFantasia || ''}"`,
                `"${s.razaoSocial || ''}"`,
                `"${s.cnpj || ''}"`,
                `"${s.email || ''}"`,
                `"${s.telefone || ''}"`
            ].join(',');
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `fornecedores_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async openImportModal() {
        const modal = await this.modalCtrl.create({
            component: ImportModalComponent,
            componentProps: {
                title: 'Importar Fornecedores',
                endpointUrl: 'suppliers/import'
            },
            cssClass: 'import-modal'
        });

        modal.onDidDismiss().then((result) => {
            if (result.data) {
                this.loadSuppliers();
            }
        });

        await modal.present();
    }
}
