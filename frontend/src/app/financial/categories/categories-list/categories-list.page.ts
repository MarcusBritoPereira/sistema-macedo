import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, pricetagOutline, chevronForwardOutline, pricetagsOutline, add, arrowDownCircleOutline, arrowUpCircleOutline, cloudUploadOutline, downloadOutline } from 'ionicons/icons';
import { CategoriesService, Category } from '../../../services/financial/categories.service';
import { RouterModule } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ImportModalComponent } from '../../../shared/components/import-modal/import-modal.component';

@Component({
  selector: 'app-categories-list',
  templateUrl: './categories-list.page.html',
  styleUrls: ['./categories-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent]
})
export class CategoriesListPage implements OnInit {
  categories: Category[] = [];
  filteredCategories: Category[] = [];

  constructor(
    private categoriesService: CategoriesService,
    private modalCtrl: ModalController
  ) {
    addIcons({ searchOutline, pricetagOutline, chevronForwardOutline, pricetagsOutline, add, arrowDownCircleOutline, arrowUpCircleOutline, cloudUploadOutline, downloadOutline });
  }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories(event?: any) {
    this.categoriesService.findAll().subscribe({
      next: (data) => {
        this.categories = data;
        this.filteredCategories = data; // Initialize filtered list
        if (event) event.target.complete();
      },
      error: (error) => {
        console.error('Error loading categories', error);
        if (event) event.target.complete();
      }
    });
  }

  filterCategories(event: any) {
    const query = event.target.value?.toLowerCase() || '';

    if (!query) {
      this.filteredCategories = [...this.categories];
      return;
    }

    this.filteredCategories = this.categories.filter(category =>
      category.nome.toLowerCase().includes(query)
    );
  }

  exportCSV() {
    // Simple CSV export logic for Categories
    const csvRows = [];
    csvRows.push('ID,Nome,Tipo,Subcategorias');
    
    this.categories.forEach(cat => {
      const id = cat.id || '';
      const nome = cat.nome ? `"${cat.nome.replace(/"/g, '""')}"` : '';
      const tipo = cat.tipo || '';
      const subLength = cat.subcategorias ? cat.subcategorias.length : 0;
      csvRows.push(`${id},${nome},${tipo},${subLength}`);
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "categorias.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async openImportModal() {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: {
        title: 'Importar Categorias',
        endpointUrl: 'financial/categories/import'
      },
      cssClass: 'import-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadCategories();
      }
    });

    await modal.present();
  }
}
