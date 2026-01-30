import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { add, searchOutline, downloadOutline, chevronForwardOutline } from 'ionicons/icons';
import { SuppliersService, Supplier } from '../../services/suppliers/suppliers.service';

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

    constructor(private suppliersService: SuppliersService) {
        addIcons({ add, searchOutline, downloadOutline, chevronForwardOutline });
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
}
