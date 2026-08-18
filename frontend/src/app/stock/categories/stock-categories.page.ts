import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  folderOpenOutline,
  gitNetworkOutline,
  linkOutline,
  powerOutline,
  refreshOutline,
  saveOutline,
  searchOutline,
  trashOutline,
  chevronDownOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import {
  StockCategory,
  StockService,
} from '../../services/stock/stock.service';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type LevelFilter = 'ALL' | 'ROOT' | 'CHILD';

@Component({
  selector: 'app-stock-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './stock-categories.page.html',
  styleUrls: ['./stock-categories.page.scss'],
})
export class StockCategoriesPage implements OnInit {
  loading = true;
  saving = false;
  drawerOpen = false;

  search = '';
  statusFilter: StatusFilter = 'ALL';
  levelFilter: LevelFilter = 'ALL';

  categories: StockCategory[] = [];
  filteredCategories: StockCategory[] = [];
  form: StockCategory = this.emptyForm();
  expandedCategories: Record<string, boolean> = {};

  constructor(
    private readonly stock: StockService,
    private readonly toastController: ToastController,
  ) {
    addIcons({
      addOutline,
      checkmarkCircleOutline,
      closeOutline,
      createOutline,
      folderOpenOutline,
      gitNetworkOutline,
      linkOutline,
      powerOutline,
      refreshOutline,
      saveOutline,
      searchOutline,
      trashOutline,
      chevronDownOutline,
      chevronForwardOutline,
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;

    this.stock
      .getCategories({
        take: 5000,
      })
      .subscribe({
        next: (response) => {
          this.categories = response.items || [];
          this.applyFilters();
          this.loading = false;
        },
        error: async () => {
          this.categories = [];
          this.filteredCategories = [];
          this.loading = false;

          await this.showToast(
            'Não foi possível carregar as categorias.',
            'danger',
          );
        },
      });
  }

  applyFilters(): void {
    const term = this.normalize(this.search);

    this.filteredCategories = this.categories.filter((category) => {
      const matchesSearch =
        !term ||
        [
          category.nome,
          category.descricao,
          category.parent?.nome,
          category.categoriaFinanceira?.nome,
          category.centroCustoPadrao?.nome,
        ].some((value) => this.normalize(value).includes(term));

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' &&
          category.ativo !== false) ||
        (this.statusFilter === 'INACTIVE' &&
          category.ativo === false);

      const matchesLevel =
        this.levelFilter === 'ALL' ||
        (this.levelFilter === 'ROOT' && !category.parentId) ||
        (this.levelFilter === 'CHILD' && Boolean(category.parentId));

      return matchesSearch && matchesStatus && matchesLevel;
    });

    // Build a map for quick lookup
    const categoryMap = new Map<string, StockCategory[]>();
    this.filteredCategories.forEach(c => {
      const parentId = c.parentId || 'root';
      if (!categoryMap.has(parentId)) categoryMap.set(parentId, []);
      categoryMap.get(parentId)!.push(c);
    });

    const sorted: StockCategory[] = [];
    
    const flatten = (parentId: string, depth: number) => {
      const children = categoryMap.get(parentId) || [];
      for (const child of children) {
        child.level = depth;
        sorted.push(child);
        if (this.expandedCategories[child.id!] === undefined) {
          this.expandedCategories[child.id!] = false; // Collapse by default except root
        }
        flatten(child.id!, depth + 1);
      }
    };

    flatten('root', 0);
    
    // Add any orphaned children that weren't reached
    const orphaned = this.filteredCategories.filter(c => !sorted.find(s => s.id === c.id));
    for (const orphan of orphaned) {
      orphan.level = 0;
      sorted.push(orphan);
    }
    
    this.filteredCategories = sorted;
  }

  toggleExpand(categoryId: string | undefined): void {
    if (!categoryId) return;
    this.expandedCategories[categoryId] = !this.expandedCategories[categoryId];
  }

  isCategoryVisible(category: StockCategory): boolean {
    if (!category.parentId && !category.parent?.id) return true; // Roots are always visible
    
    // If we are searching, show everything matching
    if (this.search) return true; 

    // Walk up the tree to see if any parent is collapsed
    let currentParentId = category.parentId || category.parent?.id;
    while (currentParentId) {
      if (this.expandedCategories[currentParentId] === false) {
        return false;
      }
      const parent = this.categories.find(c => c.id === currentParentId);
      currentParentId = parent?.parentId || parent?.parent?.id;
    }

    return true;
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'ALL';
    this.levelFilter = 'ALL';
    this.applyFilters();
  }

  openNew(): void {
    this.form = this.emptyForm();
    this.drawerOpen = true;
  }

  edit(category: StockCategory): void {
    this.form = {
      ...category,
      parentId: category.parentId || category.parent?.id || null,
      categoriaFinanceiraId:
        category.categoriaFinanceiraId ||
        category.categoriaFinanceira?.id ||
        null,
      centroCustoPadraoId:
        category.centroCustoPadraoId ||
        category.centroCustoPadrao?.id ||
        null,
    };

    this.drawerOpen = true;
  }

  closeDrawer(): void {
    if (this.saving) {
      return;
    }

    this.drawerOpen = false;
    this.form = this.emptyForm();
  }

  save(): void {
    if (!this.form.nome?.trim()) {
      this.showToast(
        'Informe o nome da categoria.',
        'warning',
      );
      return;
    }

    this.saving = true;

    const payload: Partial<StockCategory> = {
      nome: this.form.nome.trim(),
      descricao: this.form.descricao?.trim() || null,
      parentId: this.form.parentId || null,
      categoriaFinanceiraId: this.form.categoriaFinanceiraId || null,
      centroCustoPadraoId: this.form.centroCustoPadraoId || null,
      ativo: this.form.ativo,
    };

    const request = this.form.id
      ? this.stock.updateCategory(this.form.id, payload as any)
      : this.stock.createCategory(payload as any);

    request.subscribe({
      next: async () => {
        const wasEditing = Boolean(payload.id);

        this.saving = false;
        this.drawerOpen = false;
        this.form = this.emptyForm();

        await this.showToast(
          wasEditing
            ? 'Categoria atualizada com sucesso.'
            : 'Categoria cadastrada com sucesso.',
          'success',
        );

        this.load();
      },
      error: async (error) => {
        this.saving = false;

        await this.showToast(
          error?.error?.message ||
            'Não foi possível salvar a categoria.',
          'danger',
        );
      },
    });
  }

  removeCategory(category: StockCategory): void {
    if (!category.id) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja inativar a categoria "${category.nome}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.stock.deleteCategory(category.id).subscribe({
      next: async () => {
        await this.showToast(
          'Categoria inativada com sucesso.',
          'success',
        );

        this.load();
      },
      error: async (error) => {
        await this.showToast(
          error?.error?.message ||
            'Não foi possível inativar a categoria.',
          'danger',
        );
      },
    });
  }

  get totalCategories(): number {
    return this.categories.length;
  }

  get activeCategories(): number {
    return this.categories.filter(
      (category) => category.ativo !== false,
    ).length;
  }

  get linkedCategories(): number {
    return this.categories.filter(
      (category) =>
        Boolean(category.categoriaFinanceiraId) ||
        Boolean(category.categoriaFinanceira),
    ).length;
  }

  get hierarchicalCategories(): number {
    return this.categories.filter(
      (category) =>
        Boolean(category.parentId) ||
        Boolean(category.parent) ||
        Number(category._count?.children || 0) > 0,
    ).length;
  }

  get availableParents(): StockCategory[] {
    return this.categories.filter(
      (category) =>
        category.ativo !== false &&
        category.id !== this.form.id,
    );
  }

  getMaterialCount(category: StockCategory): number {
    return Number(category._count?.materiais || 0);
  }

  getChildrenCount(category: StockCategory): number {
    return Number(category._count?.children || 0);
  }

  getCategoryLevel(category: StockCategory): string {
    return category.parentId || category.parent
      ? 'Subcategoria'
      : 'Principal';
  }

  trackByCategory(
    _index: number,
    category: StockCategory,
  ): string {
    return category.id || category.nome;
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private emptyForm(): StockCategory {
    return {
      nome: '',
      descricao: '',
      parentId: null,
      categoriaFinanceiraId: null,
      centroCustoPadraoId: null,
      ativo: true,
    };
  }

  private async showToast(
    message: string,
    color: string,
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
    });

    await toast.present();
  }
}
