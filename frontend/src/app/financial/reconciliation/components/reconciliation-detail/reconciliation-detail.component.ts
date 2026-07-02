import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonSearchbar,
  IonChip,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonModal,
  IonContent,
  IonDatetimeButton,
  IonItem,
  IonLabel,
  ModalController,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  checkmarkCircleOutline,
  searchOutline,
  addOutline,
  linkOutline,
  warningOutline,
  calendarOutline,
  cashOutline,
  swapHorizontalOutline,
  locationOutline,
  businessOutline,
  cloudUploadOutline,
  chevronDownOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  BankStatement,
  SuggestedMatch,
} from '../../../../services/financial/reconciliation';
import { ReconciliationService } from '../../../../services/financial/reconciliation.service';
import {
  CategoriesService,
  Category,
} from '../../../../services/financial/categories.service';
import {
  FinancialService,
  BankAccount,
} from '../../../../services/financial/financial';
import { ClientsService, Cliente } from '../../../../services/clients/clients';
import {
  SuppliersService,
  Supplier,
} from '../../../../services/suppliers/suppliers.service';
import {
  CostCentersService,
  CostCenter,
} from '../../../../services/financial/cost-centers.service';
import {
  ObrasService,
  Obra,
} from '../../../../services/financial/obras.service';
import {
  QuickCreateModalComponent,
  EntityType,
} from '../../../../shared/components/quick-create-modal/quick-create-modal.component';
import {
  SearchableSelectionModalComponent,
  SelectionItem,
} from '../../../../shared/components/searchable-selection-modal/searchable-selection-modal.component';

@Component({
  selector: 'app-reconciliation-detail',
  templateUrl: './reconciliation-detail.component.html',
  styleUrls: ['./reconciliation-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSearchbar,
    IonChip,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    IonModal,
    IonContent,
    IonDatetimeButton,
    IonItem,
    IonLabel,
    QuickCreateModalComponent,
    SearchableSelectionModalComponent,
  ],
})
export class ReconciliationDetailComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() statement!: BankStatement;
  @Input() suggestions: SuggestedMatch[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() complete = new EventEmitter<void>();

  @Input() categories: Category[] = [];
  @Input() suppliers: Supplier[] = [];
  @Input() clients: Cliente[] = [];
  @Input() costCenters: CostCenter[] = [];

  localCategories: Category[] = [];
  localSuppliers: Supplier[] = [];
  localClients: Cliente[] = [];
  localCostCenters: CostCenter[] = [];
  filteredCategories: Category[] = [];

  obras: Obra[] = [];
  bankAccounts: BankAccount[] = [];
  allCategories: Category[] = [];

  loadingAux = false;
  loadingAction = false;
  loadingSuggestions = false;
  private draftTimer?: ReturnType<typeof setInterval>;
  private draftRestored = false;

  // UI State
  activeTab: 'NEW' | 'TRANSFER' = 'NEW';
  mode: 'FORM' | 'SEARCH' = 'FORM';

  // Form for new transaction
  form: any = {
    descricao: '',
    valor: 0,
    dataVencimento: '',
    dataCompetencia: '',
    categoriaId: '',
    fornecedorId: '', // Used for both supplier and client ID
    centroCustoId: '',
    classificacao: '',
    tipoLancamento: 'ADMINISTRATIVO',
    tipoCusto: 'OUTROS',
    categoriaCusto: '',
    contaDestinoId: '',
    obraId: '',
    items: [],
  };

  constructor(
    private reconciliationService: ReconciliationService,
    private categoriesService: CategoriesService,
    private suppliersService: SuppliersService,
    private clientsService: ClientsService,
    private costCentersService: CostCentersService,
    private obrasService: ObrasService,
    private financialService: FinancialService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      closeOutline,
      checkmarkCircleOutline,
      searchOutline,
      addOutline,
      linkOutline,
      warningOutline,
      calendarOutline,
      cashOutline,
      swapHorizontalOutline,
      locationOutline,
      businessOutline,
      cloudUploadOutline,
      chevronDownOutline,
      trashOutline,
    });
  }

  @ViewChild('searchBar') searchBar!: IonSearchbar;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categories']) {
      this.localCategories = [...(this.categories || [])];
      this.allCategories = [...this.localCategories];
      this.filterCategoriesByClassification();
    }
    if (changes['suppliers']) {
      this.localSuppliers = [...(this.suppliers || [])];
    }
    if (changes['clients']) {
      this.localClients = [...(this.clients || [])];
    }
    if (changes['costCenters']) {
      this.localCostCenters = [...(this.costCenters || [])];
    }
  }

  ngOnInit() {
    if (this.statement) {
      this.form.descricao = this.statement.descricao;
      this.form.valor = Math.abs(Number(this.statement.valor));

      const dateStr = this.statement.data
        ? this.statement.data.substring(0, 10)
        : new Date().toISOString().substring(0, 10);
      this.form.dataVencimento = dateStr;
      this.form.dataCompetencia = dateStr; // Default to statement date

      this.form.classificacao =
        this.statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';
      this.form.tipoLancamento = 'ADMINISTRATIVO';
      this.form.obraId = '';
      this.form.items = [];

      if (
        this.statement.tipo === 'CREDIT' &&
        this.statement.suggestedEntity?.cliente?.id
      ) {
        this.form.fornecedorId = this.statement.suggestedEntity.cliente.id;
      }
      if (
        this.statement.tipo === 'DEBIT' &&
        this.statement.suggestedEntity?.fornecedor?.id
      ) {
        this.form.fornecedorId = this.statement.suggestedEntity.fornecedor.id;
      }

      // Apply dynamically learned suggestions from past identical statements
      if (this.statement.learnedSuggestion) {
        const ls = this.statement.learnedSuggestion;
        if (ls.categoriaId) this.form.categoriaId = ls.categoriaId;
        if (ls.centroCustoId) this.form.centroCustoId = ls.centroCustoId;
        if (ls.fornecedorId) this.form.fornecedorId = ls.fornecedorId;
        if (ls.clienteId) this.form.fornecedorId = ls.clienteId;
        if (ls.tipoLancamento) this.form.tipoLancamento = ls.tipoLancamento;
        if (ls.tipoCusto) this.form.tipoCusto = ls.tipoCusto;
        if (ls.categoriaCusto) this.form.categoriaCusto = ls.categoriaCusto;
        if (ls.obraId) this.form.obraId = ls.obraId;

        setTimeout(() => {
          this.presentToast(
            'Preenchido automaticamente com base em conciliações anteriores!',
            'success',
          );
        }, 600);
      }

      this.loadAuxData();
      this.restoreDraft();
      this.draftTimer = setInterval(() => this.saveDraft(), 1000);

      // Load active obras
      this.obrasService.getAll().subscribe({
        next: (obras) => {
          this.obras = obras || [];
        },
        error: (err) => console.error('Erro ao buscar obras:', err),
      });

      // Auto-switch to SEARCH if suggestions exist
      if (this.suggestions && this.suggestions.length > 0) {
        this.mode = 'SEARCH';
        setTimeout(() => this.searchBar?.setFocus(), 100);
      }
    }
  }

  toggleMode() {
    this.mode = this.mode === 'FORM' ? 'SEARCH' : 'FORM';
    if (this.mode === 'SEARCH') {
      setTimeout(() => {
        this.searchBar?.setFocus();
      }, 500);
    }
  }

  formatDate(dateStr: string | Date | undefined) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (e) {
      return '-';
    }
  }

  loadAuxData() {
    this.loadingAux = true;
    const targetType = this.statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';

    const processData = () => {
      this.allCategories = [...(this.localCategories || [])];
      this.filterCategoriesByClassification();

      // Default to "Geral" if not set
      if (!this.form.centroCustoId && this.localCostCenters.length > 0) {
        const geral = this.localCostCenters.find(
          (c) => c.nome.toLowerCase() === 'geral',
        );
        if (geral) {
          this.form.centroCustoId = geral.id;
        }
      }

      // Load bank accounts for transfers
      this.financialService.getBankAccounts().subscribe({
        next: (accounts: BankAccount[]) => {
          const originAccountId = this.statement.importacao?.contaBancariaId;
          this.bankAccounts = originAccountId
            ? accounts.filter((acc: BankAccount) => acc.id !== originAccountId)
            : accounts;
          this.loadingAux = false;
        },
        error: () => {
          this.loadingAux = false;
        },
      });
    };

    // Fallback: If for some reason lists were not passed from parent, fetch them
    if (
      (!this.localCategories || this.localCategories.length === 0) &&
      (!this.localCostCenters || this.localCostCenters.length === 0)
    ) {
      this.categoriesService.findAll().subscribe((cats) => {
        this.localCategories = cats;
        this.allCategories = [...this.localCategories];
        if (targetType === 'DESPESA') {
          this.suppliersService.findAll().subscribe((sups) => {
            this.localSuppliers = sups;
            this.costCentersService.findAll().subscribe((ccs) => {
              this.localCostCenters = ccs;
              processData();
            });
          });
        } else {
          this.clientsService.findAll().subscribe((clients) => {
            this.localClients = clients;
            this.costCentersService.findAll().subscribe((ccs) => {
              this.localCostCenters = ccs;
              processData();
            });
          });
        }
      });
    } else {
      processData();
    }
  }

  filterCategoriesByClassification() {
    const currentClassification = this.form.classificacao; // RECEITA or DESPESA
    const targetType =
      currentClassification === 'RECEITA' ? 'RECEITA' : 'DESPESA';
    this.filteredCategories = (this.allCategories || []).filter(
      (c) => c && c.tipo === targetType,
    );

    // If the currently selected category doesn't belong to the new list, clear it
    if (this.form.categoriaId) {
      const exists = (this.filteredCategories || []).some(
        (c) => c && c.id === this.form.categoriaId,
      );
      if (!exists) {
        this.form.categoriaId = '';
      }
    }
  }

  onClassificationChange() {
    this.filterCategoriesByClassification();
  }

  addItem() {
    this.form.items.push({
      tipoDestino: 'OBRA',
      obraId: '',
      centroCustoId: '',
      categoriaId: this.form.categoriaId || '',
      tipoCusto: this.form.tipoCusto || 'MATERIAL',
      categoriaCusto: '',
      descricao: '',
      quantidade: 1,
      valor: 0,
      valorStr: '',
    });
    this.saveDraft();
  }

  removeItem(index: number) {
    this.form.items.splice(index, 1);
    this.saveDraft();
  }

  onAllocationDestinationChange(item: any) {
    if (item.tipoDestino === 'OBRA') {
      item.centroCustoId = '';
    } else {
      item.obraId = '';
      const availableCenters = this.getCostCentersForAllocation(item);
      if (
        item.centroCustoId &&
        !availableCenters.some((center) => center.id === item.centroCustoId)
      ) {
        item.centroCustoId = '';
      }
    }
    this.saveDraft();
  }

  onAllocationObraChange(item: any) {
    const obra = this.obras.find((o) => o.id === item.obraId);
    if (obra?.centroCustoId) item.centroCustoId = obra.centroCustoId;
    this.saveDraft();
  }

  distributeEqually() {
    if (!this.form.items?.length) this.addItem();
    const totalCents = Math.round(Number(this.form.valor || 0) * 100);
    const base = Math.floor(totalCents / this.form.items.length);
    let remaining = totalCents;
    this.form.items.forEach((item: any, index: number) => {
      const cents = index === this.form.items.length - 1 ? remaining : base;
      item.valor = cents / 100;
      item.valorStr = this.formatValorUnitario(item.valor);
      remaining -= cents;
    });
    this.saveDraft();
  }

  adjustDifferenceOnLast() {
    if (!this.form.items?.length) return;
    const last = this.form.items[this.form.items.length - 1];
    last.valor = Math.max(
      0,
      Number(last.valor || 0) +
        (Number(this.form.valor) - this.getItemsTotal()),
    );
    last.valorStr = this.formatValorUnitario(last.valor);
    this.saveDraft();
  }

  formatValorUnitario(value: number | undefined | null): string {
    if (value === undefined || value === null || value === 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  onValorUnitarioInput(event: any, item: any) {
    const val = event.target.value;
    item.valorStr = val;

    if (!val) {
      item.valor = 0;
      return;
    }

    let cleaned = val.replace(/\s/g, '').replace('R$', '');
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      cleaned = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(cleaned);
    item.valor = isNaN(parsed) ? 0 : parsed;
  }

  onValorUnitarioBlur(event: any, item: any) {
    item.valorStr = this.formatValorUnitario(item.valor);
    event.target.value = item.valorStr;
    this.saveDraft();
  }

  onValorUnitarioFocus(event: any, item: any) {
    if (item.valor > 0) {
      item.valorStr = item.valor.toString().replace('.', ',');
      event.target.value = item.valorStr;
    }
  }

  isFormValid(): boolean {
    if (this.activeTab === 'TRANSFER') {
      return !!this.form.contaDestinoId && !!this.form.dataCompetencia;
    }

    // Tab is 'NEW'
    if (
      !this.form.descricao ||
      !this.form.dataCompetencia ||
      !this.form.classificacao ||
      !this.form.tipoLancamento
    ) {
      return false;
    }

    const hasRateios = this.form.items && this.form.items.length > 0;
    if (!hasRateios && (!this.form.categoriaId || !this.form.centroCustoId))
      return false;
    if (
      !hasRateios &&
      (this.form.tipoLancamento === 'OBRA' ||
        this.form.tipoLancamento === 'POS_OBRA') &&
      !this.form.obraId
    )
      return false;
    if (
      hasRateios &&
      this.form.items.some((item: any) => !this.isAllocationValid(item))
    )
      return false;

    // Items must match sum
    if (
      this.form.items &&
      this.form.items.length > 0 &&
      !this.isItemsTotalMatching()
    ) {
      return false;
    }

    return true;
  }

  isAllocationValid(item: any): boolean {
    return (
      !!item.categoriaId &&
      Number(item.valor) > 0 &&
      ((item.tipoDestino === 'OBRA' && !!item.obraId) ||
        (this.isCostCenterDestination(item) && !!item.centroCustoId)) &&
      (item.tipoCusto !== 'MATERIAL' || !!item.categoriaCusto?.trim())
    );
  }

  isCostCenterDestination(item: any): boolean {
    return ['CENTRO_CUSTO', 'DEPOSITO', 'ESCRITORIO'].includes(
      item?.tipoDestino,
    );
  }

  private normalizeLabel(value?: string | null): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  getCostCentersForAllocation(item: any): CostCenter[] {
    const centers = (this.localCostCenters || []).filter(c => c.ativo !== false && c.aceitaLancamento !== false);
    const filterByText = (needle: string) =>
      centers.filter((center) => {
        const text = this.normalizeLabel(
          [center.nome, center.codigo, center.tags, center.descricao]
            .filter(Boolean)
            .join(' '),
        );
        return text.includes(needle);
      });

    if (item?.tipoDestino === 'DEPOSITO') {
      const filtered = filterByText('deposito');
      return filtered.length ? filtered : centers;
    }

    if (item?.tipoDestino === 'ESCRITORIO') {
      const filtered = filterByText('escritorio');
      return filtered.length ? filtered : centers;
    }

    return centers;
  }

  getDestinationFieldLabel(item: any): string {
    if (item?.tipoDestino === 'DEPOSITO') return 'Depósito *';
    if (item?.tipoDestino === 'ESCRITORIO') return 'Escritório *';
    return 'Centro de custo *';
  }

  getDestinationPlaceholder(item: any): string {
    if (item?.tipoDestino === 'DEPOSITO') return 'Selecione o depósito';
    if (item?.tipoDestino === 'ESCRITORIO') return 'Selecione o escritório';
    return 'Selecione o destino';
  }

  getLinkedLaunch(): any {
    return this.statement.conciliacoes?.[0]?.lancamentoFinanceiro || null;
  }

  getLinkedRateios(): any[] {
    return this.getLinkedLaunch()?.rateios || [];
  }

  getRateioDestination(rateio: any): string {
    if (rateio?.tipoDestino === 'OBRA') return rateio.obra?.nome || 'Obra';
    return rateio?.centroCusto?.nome || 'Centro de custo';
  }

  getTipoCustoLabel(tipo?: string): string {
    const labels: Record<string, string> = {
      MATERIAL: 'Material',
      MAO_DE_OBRA: 'Mão de obra',
      SERVICO: 'Serviço',
      EQUIPAMENTO: 'Equipamento',
      OUTROS: 'Outros',
    };
    return tipo ? labels[tipo] || tipo : '-';
  }

  getLancamentoTipoLabel(tipo?: string): string {
    const labels: Record<string, string> = {
      OBRA: 'De Obras',
      POS_OBRA: 'Pós-obra',
      ADMINISTRATIVO: 'Administrativo',
      ESCRITORIO: 'Escritório',
    };
    return tipo ? labels[tipo] || tipo : '-';
  }

  getItemsTotal(): number {
    if (!this.form.items || this.form.items.length === 0) return 0;
    return this.form.items.reduce(
      (sum: number, item: any) => sum + Number(item.valor || 0),
      0,
    );
  }

  isItemsTotalMatching(): boolean {
    if (!this.form.items || this.form.items.length === 0) return true;
    return Math.abs(this.getItemsTotal() - this.form.valor) < 0.01;
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  async confirmCreation() {
    if (!this.isFormValid()) {
      this.presentToast(
        'Por favor, preencha todos os campos obrigatórios corretamente.',
        'warning',
      );
      return;
    }

    const confirmed = await this.requestManualConfirmation(
      'Confirmar conciliação',
      'Deseja confirmar manualmente esta conciliação?',
    );
    if (!confirmed) {
      return;
    }

    this.loadingAction = true;

    const entityId = this.form.fornecedorId;
    const isCredit = this.statement.tipo === 'CREDIT';

    let observacoes = '';
    if (
      this.activeTab === 'NEW' &&
      this.form.items &&
      this.form.items.length > 0
    ) {
      observacoes =
        'Rateio por destino e categoria:\n' +
        this.form.items
          .map(
            (it: any) =>
              `- ${it.categoriaCusto || it.descricao || 'Rateio'}: ${Number(it.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          )
          .join('\n');
    }

    const payload = {
      descricao:
        this.activeTab === 'TRANSFER'
          ? `Transferência entre contas: ${this.statement.descricao}`
          : this.form.descricao,
      categoriaId: this.activeTab === 'TRANSFER' ? null : this.form.categoriaId,
      fornecedorId:
        this.activeTab === 'TRANSFER' ? null : isCredit ? null : entityId,
      clienteId:
        this.activeTab === 'TRANSFER' ? null : isCredit ? entityId : null,
      centroCustoId:
        this.activeTab === 'TRANSFER' ? null : this.form.centroCustoId,
      valor: this.form.valor,
      dataVencimento: this.form.dataVencimento,
      dataCompetencia: this.form.dataCompetencia,
      tipo:
        this.activeTab === 'TRANSFER'
          ? isCredit
            ? 'RECEITA'
            : 'DESPESA'
          : this.form.classificacao,
      tipoLancamento:
        this.activeTab === 'TRANSFER' ? null : this.form.tipoLancamento,
      tipoCusto: this.activeTab === 'TRANSFER' ? null : this.form.tipoCusto,
      categoriaCusto:
        this.activeTab === 'TRANSFER' ? null : this.form.categoriaCusto,
      obraId:
        this.activeTab === 'NEW' &&
        (this.form.tipoLancamento === 'OBRA' ||
          this.form.tipoLancamento === 'POS_OBRA')
          ? this.form.obraId
          : null,
      contaDestinoId:
        this.activeTab === 'TRANSFER' ? this.form.contaDestinoId : null,
      isTransfer: this.activeTab === 'TRANSFER',
      rateios:
        this.activeTab === 'NEW'
          ? this.form.items.map((item: any) => ({
              valor: Number(item.valor),
              categoria: 'OUTROS',
              categoriaFinanceiraId: item.categoriaId,
              tipoDestino:
                item.tipoDestino === 'OBRA' ? 'OBRA' : 'CENTRO_CUSTO',
              obraId: item.tipoDestino === 'OBRA' ? item.obraId : null,
              centroCustoId: item.centroCustoId || null,
              tipoCusto: item.tipoCusto,
              categoriaCusto: item.categoriaCusto,
              descricaoItem: item.descricao,
              quantidade: Number(item.quantidade || 0) || null,
              valorUnitario:
                Number(item.quantidade || 0) > 0
                  ? Number(item.valor || 0) / Number(item.quantidade)
                  : null,
            }))
          : [],
      observacoes: observacoes || undefined,
    };

    this.reconciliationService
      .createAndLink(this.statement.id, payload, true)
      .subscribe({
        next: () => {
          this.loadingAction = false;
          this.clearDraft();
          this.complete.emit();
        },
        error: (err: any) => {
          console.error(err);
          this.loadingAction = false;
          const errorMsg =
            err.error?.message || 'Erro ao realizar conciliação.';
          this.presentToast(errorMsg, 'danger');
        },
      });
  }

  async link(match: SuggestedMatch) {
    const confirmed = await this.requestManualConfirmation(
      'Confirmar vínculo',
      'Deseja confirmar manualmente este vínculo de conciliação?',
    );
    if (!confirmed) {
      return;
    }

    this.loadingAction = true;
    this.reconciliationService
      .linkManual(this.statement.id, match.id, true)
      .subscribe({
        next: () => {
          this.loadingAction = false;
          this.clearDraft();
          this.complete.emit();
        },
        error: (err: any) => {
          console.error(err);
          this.loadingAction = false;
        },
      });
  }

  cancel() {
    this.close.emit();
  }

  private async requestManualConfirmation(
    header: string,
    message: string,
  ): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', role: 'confirm' },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  async unreconcile() {
    if (
      !this.statement.conciliacoes ||
      this.statement.conciliacoes.length === 0
    ) {
      return;
    }

    const reconciliationId = this.statement.conciliacoes[0].id; // Assuming one-to-one for simplicity usually

    this.loadingAction = true;
    this.reconciliationService.unlink(reconciliationId).subscribe({
      next: () => {
        this.loadingAction = false;
        this.clearDraft();
        this.complete.emit();
      },
      error: (err: any) => {
        console.error(err);
        this.loadingAction = false;
      },
    });
  }

  // --- Searchable Modal Logic ---

  async openSelection(type: 'CATEGORY' | 'ENTITY' | 'COST_CENTER') {
    let items: SelectionItem[] = [];
    let title = '';
    let createLabel = '';
    let selectedId = '';
    let enableCreate = true;

    if (type === 'CATEGORY') {
      title = 'Selecione a Categoria';
      createLabel = 'Nova Categoria';
      selectedId = this.form.categoriaId;
      items = (this.filteredCategories || []).map((c) => ({
        id: c?.id || '',
        label: c?.nome || '',
      }));
    } else if (type === 'ENTITY') {
      // Supplier or Client
      const isCredit = this.statement?.tipo === 'CREDIT';
      title = isCredit ? 'Selecione o Cliente' : 'Selecione o Fornecedor';
      createLabel = isCredit ? 'Novo Cliente' : 'Novo Fornecedor';
      selectedId = this.form.fornecedorId;

      if (isCredit) {
        items = (this.localClients || []).map((c) => ({
          id: c?.id || '',
          label: c?.nomeFantasia || c?.razaoSocial || '',
          subLabel: c?.cnpj || c?.cpf || '',
        }));
      } else {
        items = (this.localSuppliers || []).map((s) => ({
          id: s?.id || '',
          label: s?.nomeFantasia || '',
          subLabel: s?.cnpj || '',
        }));
      }
    } else if (type === 'COST_CENTER') {
      title = 'Selecione o Centro de Custo';
      createLabel = 'Novo Centro de Custo';
      selectedId = this.form.centroCustoId;
      items = (this.localCostCenters || []).map((cc) => ({
        id: cc?.id || '',
        label: cc?.nome || '',
      }));
    }

    const modal = await this.modalCtrl.create({
      component: SearchableSelectionModalComponent,
      componentProps: {
        title,
        items,
        selectedId,
        enableCreate,
        createLabel,
      },
      cssClass: 'centered-selection-modal',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      if (data.id === '_NEW_') {
        // Trigger quick create
        const qTypeMap: any = {
          CATEGORY: 'CATEGORY',
          ENTITY: this.statement?.tipo === 'CREDIT' ? 'CLIENT' : 'SUPPLIER',
          COST_CENTER: 'COST_CENTER',
        };
        await this.openQuickCreate(qTypeMap[type]);
      } else {
        // Determine which field to set
        if (type === 'CATEGORY') this.form.categoriaId = data.id;
        if (type === 'ENTITY') this.form.fornecedorId = data.id;
        if (type === 'COST_CENTER') this.form.centroCustoId = data.id;
      }
    }
  }

  // --- Helpers for Display ---

  getCategoryName(): string {
    if (!this.localCategories) return '';
    const c = this.localCategories.find(
      (x) => x && x.id === this.form.categoriaId,
    );
    return c ? c.nome : '';
  }

  getEntityName(): string {
    const isCredit = this.statement?.tipo === 'CREDIT';
    if (isCredit) {
      if (!this.localClients) return '';
      const c = this.localClients.find(
        (x) => x && x.id === this.form.fornecedorId,
      );
      return c ? c.nomeFantasia || c.razaoSocial : '';
    } else {
      if (!this.localSuppliers) return '';
      const s = this.localSuppliers.find(
        (x) => x && x.id === this.form.fornecedorId,
      );
      return s ? s.nomeFantasia : '';
    }
  }

  getCostCenterName(): string {
    if (!this.localCostCenters) return '';
    const c = this.localCostCenters.find(
      (x) => x && x.id === this.form.centroCustoId,
    );
    return c ? c.nome : '';
  }

  // --- Quick Create Logic (Existing) ---

  async openQuickCreate(type: EntityType) {
    const targetType =
      this.statement?.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';

    const modal = await this.modalCtrl.create({
      component: QuickCreateModalComponent,
      componentProps: {
        entityType: type,
        parentContext: type === 'CATEGORY' ? targetType : undefined,
      },
      cssClass: 'centered-selection-modal',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      // New item created!
      if (type === 'CATEGORY') {
        this.localCategories.push(data);
        this.allCategories = [...this.localCategories];
        this.filterCategoriesByClassification();
        this.form.categoriaId = data.id;
      } else if (type === 'SUPPLIER') {
        this.localSuppliers.push(data);
        this.form.fornecedorId = data.id;
      } else if (type === 'CLIENT') {
        this.localClients.push(data);
        this.form.fornecedorId = data.id;
      } else if (type === 'COST_CENTER') {
        this.localCostCenters.push(data);
        this.form.centroCustoId = data.id;
      }
    }
  }

  private get draftKey(): string {
    return `reconciliation-draft:${this.statement?.id || 'new'}`;
  }

  saveDraft() {
    if (!this.statement?.id || this.loadingAction || !this.draftRestored)
      return;
    sessionStorage.setItem(
      this.draftKey,
      JSON.stringify({ form: this.form, activeTab: this.activeTab }),
    );
  }

  private restoreDraft() {
    const raw = sessionStorage.getItem(this.draftKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        this.form = {
          ...this.form,
          ...draft.form,
          items: draft.form?.items || [],
        };
        this.activeTab = draft.activeTab || 'NEW';
        setTimeout(
          () =>
            this.presentToast('Rascunho da conciliação recuperado.', 'success'),
          300,
        );
      } catch {
        sessionStorage.removeItem(this.draftKey);
      }
    }
    this.draftRestored = true;
  }

  private clearDraft() {
    this.draftRestored = false;
    sessionStorage.removeItem(this.draftKey);
  }

  ngOnDestroy() {
    if (this.draftTimer) clearInterval(this.draftTimer);
    this.saveDraft();
  }
}
