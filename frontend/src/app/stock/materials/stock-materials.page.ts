import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  ToastController,
  AlertController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  cashOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  cubeOutline,
  layersOutline,
  powerOutline,
  refreshOutline,
  saveOutline,
  searchOutline,
  trashOutline,
  logoWhatsapp,
} from 'ionicons/icons';
import {
  StockCategory,
  StockLocation,
  StockMaterial,
  StockService,
} from '../../services/stock/stock.service';
import { AuthService } from '../../services/auth/auth.service';
import { StockBalanceAdjustmentModalComponent } from './components/stock-balance-adjustment-modal/stock-balance-adjustment-modal.component';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

type StockFilter =
  | 'ALL'
  | 'NORMAL'
  | 'REPOSICAO'
  | 'BAIXO'
  | 'ZERADO'
  | 'NEGATIVO';

@Component({
  selector: 'app-stock-materials',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './stock-materials.page.html',
  styleUrls: ['./stock-materials.page.scss'],
})
export class StockMaterialsPage implements OnInit {
  loading = true;
  saving = false;
  drawerOpen = false;

  search = '';
  categoryFilter = '';
  statusFilter: StatusFilter = 'ALL';
  stockFilter: StockFilter = 'ALL';
  tabFilter: 'ALL' | 'CONSUMO' | 'FERRAMENTA' | 'EQUIPAMENTO' = 'ALL';
  isWorker = false;

  materials: StockMaterial[] = [];
  filteredMaterials: StockMaterial[] = [];
  categories: StockCategory[] = [];
  locations: StockLocation[] = [];

  form: StockMaterial = this.emptyForm();

  readonly units = [
    'UN',
    'KG',
    'G',
    'T',
    'M',
    'M2',
    'M3',
    'L',
    'ML',
    'CX',
    'PCT',
    'SC',
    'RL',
    'BD',
    'GL',
  ];

  constructor(
    private readonly stock: StockService,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController,
    private readonly modalController: ModalController,
    private readonly auth: AuthService,
  ) {
    addIcons({
      addOutline,
      alertCircleOutline,
      cashOutline,
      checkmarkCircleOutline,
      closeOutline,
      createOutline,
      cubeOutline,
      layersOutline,
      powerOutline,
      refreshOutline,
      saveOutline,
      searchOutline,
      trashOutline,
      logoWhatsapp,
    });
  }

  ngOnInit(): void {
    this.isWorker = this.auth.isWorkerProfile();
    this.load();
  }

  load(): void {
    this.loading = true;

    this.stock
      .getCategories({
        take: 500,
        ativo: true,
      })
      .subscribe({
        next: (response) => {
          this.categories = response.items || [];
        },
        error: () => {
          this.categories = [];
        },
      });

    this.stock
      .getLocations({ take: 500 })
      .subscribe({
        next: (response) => {
          this.locations = response.items || [];
        },
        error: () => {
          this.locations = [];
        },
      });

    this.stock
      .getMaterials({
        take: 500,
      })
      .subscribe({
        next: (response) => {
          this.materials = response.items || [];
          this.applyFilters();
          this.loading = false;
        },
        error: async () => {
          this.materials = [];
          this.filteredMaterials = [];
          this.loading = false;

          await this.showToast(
            'Não foi possível carregar os materiais.',
            'danger',
          );
        },
      });
  }

  applyFilters(): void {
    const term = this.normalize(this.search);

    this.filteredMaterials = this.materials.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.codigo,
          item.nome,
          item.marca,
          item.fabricante,
          item.codigoBarras,
          item.categoriaMaterial?.nome,
        ].some((value) => this.normalize(value).includes(term));

      const matchesCategory =
        !this.categoryFilter ||
        item.categoriaMaterialId === this.categoryFilter ||
        item.categoriaMaterial?.id === this.categoryFilter;

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' && item.ativo !== false) ||
        (this.statusFilter === 'INACTIVE' && item.ativo === false);

      const matchesStock =
        this.stockFilter === 'ALL' ||
        item.situacaoEstoque === this.stockFilter;

      const catName = this.normalize(item.categoriaMaterial?.nome || '');
      const isTool = (item as any).tipoItem === 'FERRAMENTA' || catName.includes('ferramenta');
      const isEquipment = (item as any).tipoItem === 'EQUIPAMENTO' || catName.includes('equipamento');
      
      let matchesTab = true;
      if (this.tabFilter === 'FERRAMENTA' && !isTool) matchesTab = false;
      if (this.tabFilter === 'EQUIPAMENTO' && !isEquipment) matchesTab = false;
      if (this.tabFilter === 'CONSUMO' && (isTool || isEquipment)) matchesTab = false;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesStock &&
        matchesTab
      );
    });
  }

  setTab(tab: any): void {
    this.tabFilter = tab;
    this.applyFilters();
  }

  async requestViaWhatsApp(material: StockMaterial): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Solicitar via WhatsApp',
      inputs: [
        { name: 'obra', type: 'text', placeholder: 'Nome da Obra (Ex: Obra Ana Paula)' },
        { name: 'quantidade', type: 'number', placeholder: 'Quantidade (Ex: 1)' },
        { name: 'mensagem', type: 'textarea', placeholder: 'Mensagem personalizada (opcional)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Enviar Solicitação', 
          handler: (data) => {
            if (!data.obra || !data.quantidade) {
              this.showToast('Preencha a obra e quantidade.', 'warning');
              return false;
            }
            // Generate message
            let text = `Oi!\n\nEstou precisando de ${data.quantidade} ${material.unidade} de ${material.nome}`;
            if (material.codigo) text += ` (${material.codigo})`;
            text += ` na obra *${data.obra}*.`;
            if (data.mensagem) {
              text += `\n\n${data.mensagem}`;
            }
            text += `\n\nConsegue entregar para mim? Desde já, obrigado!`;
            
            // Note: replace '5511999999999' with actual storekeeper number or a config
            // For now, it will just open whatsapp to select a contact or a dummy number
            const phone = '5511999999999'; // Default or configurable
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  clearFilters(): void {
    this.search = '';
    this.categoryFilter = '';
    this.statusFilter = 'ALL';
    this.stockFilter = 'ALL';
    this.applyFilters();
  }

  openNew(): void {
    this.form = this.emptyForm();
    this.form.codigo = this.generateNextCode();
    this.drawerOpen = true;
  }

  edit(material: StockMaterial): void {
    this.form = {
      ...material,
      categoriaMaterialId:
        material.categoriaMaterialId ||
        material.categoriaMaterial?.id ||
        '',
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
    if (!this.isFormValid()) {
      this.showToast(
        'Preencha código, nome, categoria e unidade.',
        'warning',
      );
      return;
    }

    this.saving = true;

    const payload: Partial<StockMaterial> = {
      ...this.form,
      codigo: this.form.codigo.trim(),
      nome: this.form.nome.trim(),
      categoriaMaterialId: this.form.categoriaMaterialId,
      estoqueMinimo: String(this.form.estoqueMinimo || '0'),
      estoqueMaximo:
        this.form.estoqueMaximo === '' ||
        this.form.estoqueMaximo === null ||
        this.form.estoqueMaximo === undefined
          ? null
          : String(this.form.estoqueMaximo),
      pontoReposicao: String(this.form.pontoReposicao || '0'),
      custoPadrao:
        this.form.custoPadrao === '' ||
        this.form.custoPadrao === null ||
        this.form.custoPadrao === undefined
          ? null
          : String(this.form.custoPadrao),
    };

    if (!payload.id) {
      if (this.form.estoqueInicial && Number(this.form.estoqueInicial) > 0) {
        if (!this.form.localEstoqueInicialId) {
          this.showToast('Você informou um estoque inicial. Por favor, selecione o Local de Estoque.', 'warning');
          this.saving = false;
          return;
        }
        
        payload.estoqueInicial = String(this.form.estoqueInicial);
        if (this.form.custoUnitarioInicial) {
          payload.custoUnitarioInicial = String(this.form.custoUnitarioInicial);
        }
        payload.localEstoqueInicialId = this.form.localEstoqueInicialId;
      } else {
        delete payload.estoqueInicial;
        delete payload.custoUnitarioInicial;
        delete payload.localEstoqueInicialId;
      }
    }

    const request = payload.id
      ? this.stock.updateMaterial(payload.id, payload as StockMaterial)
      : this.stock.createMaterial(payload as StockMaterial);

    request.subscribe({
      next: async () => {
        this.saving = false;
        this.drawerOpen = false;
        this.form = this.emptyForm();

        await this.showToast(
          payload.id
            ? 'Material atualizado com sucesso.'
            : 'Material cadastrado com sucesso.',
          'success',
        );

        this.load();
      },
      error: async (error) => {
        this.saving = false;

        let message = 'Não foi possível salvar o material.';
        
        if (error?.error?.message) {
          if (Array.isArray(error.error.message)) {
            message = error.error.message.join(', ');
          } else {
            message = error.error.message;
          }
        }
        
        if (message.includes('Unique constraint failed on the fields: (`codigo`)')) {
          message = 'Já existe um material com este código.';
        } else if (message.includes('Unique constraint failed')) {
          message = 'Já existe um registro com estes dados únicos no sistema.';
        }

        await this.showToast(message, 'danger');
      },
    });
  }

  removeMaterial(material: StockMaterial): void {
    if (!material.id) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja remover o material "${material.nome}"?\n\n` +
        'Quando houver movimentações, o material será apenas inativado.',
    );

    if (!confirmed) {
      return;
    }

    this.stock.deleteMaterial(material.id).subscribe({
      next: async () => {
        await this.showToast(
          'Material removido ou inativado com sucesso.',
          'success',
        );

        this.load();
      },
      error: async (error) => {
        await this.showToast(
          error?.error?.message ||
            'Não foi possível remover o material.',
          'danger',
        );
      },
    });
  }

  async adjustBalance(material: StockMaterial): Promise<void> {
    const modal = await this.modalController.create({
      component: StockBalanceAdjustmentModalComponent,
      componentProps: {
        material,
        locations: this.locations,
      },
      cssClass: 'auto-height-modal',
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && data) {
      this.stock.adjustBalance({
        materialId: material.id!,
        localEstoqueId: data.localEstoqueId,
        quantidade: data.quantidade,
        custoUnitario: data.custoUnitario,
        observacao: 'Ajuste rápido',
      }).subscribe({
        next: () => {
          this.showToast('Saldo ajustado com sucesso.', 'success');
          this.load();
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Erro ao ajustar saldo.', 'danger');
        }
      });
    }
  }

  get totalMaterials(): number {
    return this.materials.length;
  }

  get activeMaterials(): number {
    return this.materials.filter((item) => item.ativo !== false).length;
  }

  get lowStockMaterials(): number {
    return this.materials.filter((item) =>
      ['BAIXO', 'ZERADO', 'NEGATIVO'].includes(
        item.situacaoEstoque || '',
      ),
    ).length;
  }

  get reorderMaterials(): number {
    return this.materials.filter(
      (item) => item.situacaoEstoque === 'REPOSICAO',
    ).length;
  }

  get totalStockValue(): number {
    return this.materials.reduce(
      (total, item) =>
        total + this.toNumber(item.valorTotalEstoque),
      0,
    );
  }

  getSituationLabel(material: StockMaterial): string {
    const labels: Record<string, string> = {
      NORMAL: 'Normal',
      REPOSICAO: 'Repor estoque',
      BAIXO: 'Estoque baixo',
      ZERADO: 'Sem estoque',
      NEGATIVO: 'Saldo negativo',
      INATIVO: 'Inativo',
    };

    return labels[material.situacaoEstoque || 'NORMAL'] || 'Normal';
  }

  getSituationClass(material: StockMaterial): string {
    return `situation-${(
      material.situacaoEstoque || 'NORMAL'
    ).toLowerCase()}`;
  }

  isFormValid(): boolean {
    return Boolean(
      this.form.codigo?.trim() &&
        this.form.nome?.trim() &&
        this.form.categoriaMaterialId &&
        this.form.unidade,
    );
  }

  trackByMaterial(
    _index: number,
    material: StockMaterial,
  ): string {
    return material.id || material.codigo;
  }

  toNumber(value: string | number | null | undefined): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private generateNextCode(): string {
    const highest = this.materials.reduce((max, material) => {
      const match = String(material.codigo || '').match(/(\d+)$/);
      const number = match ? Number(match[1]) : 0;
      return Math.max(max, number);
    }, 0);

    return `MAT-${String(highest + 1).padStart(5, '0')}`;
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private emptyForm(): StockMaterial {
    return {
      codigo: '',
      nome: '',
      tipoItem: 'CONSUMO' as any,
      descricao: '',
      categoriaMaterialId: '',
      unidade: 'UN',
      codigoBarras: '',
      referenciaFornecedor: '',
      marca: '',
      fabricante: '',
      estoqueMinimo: '0',
      estoqueMaximo: null,
      pontoReposicao: '0',
      custoPadrao: null,
      permiteFracionado: false,
      ativo: true,
      observacoes: '',
      estoqueInicial: '0',
      custoUnitarioInicial: '',
      localEstoqueInicialId: '',
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
