import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonButton, IonIcon, IonSearchbar, IonCard, IonFab, IonFabButton, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, pricetagOutline, chevronForwardOutline, pricetagsOutline, add, arrowDownCircleOutline, arrowUpCircleOutline } from 'ionicons/icons';
import { CategoriesService, Category } from '../../../services/financial/categories.service';
import { RouterModule } from '@angular/router';

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
    private categoriesService: CategoriesService
  ) {
    addIcons({ searchOutline, pricetagOutline, chevronForwardOutline, pricetagsOutline, add, arrowDownCircleOutline, arrowUpCircleOutline });
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
}
