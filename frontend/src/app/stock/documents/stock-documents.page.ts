import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
} from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
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
  archiveOutline,
  checkmarkCircleOutline,
  closeOutline,
  closeCircleOutline,
  copyOutline,
  cubeOutline,
  documentTextOutline,
  eyeOutline,
  playCircleOutline,
  refreshOutline,
  saveOutline,
  sendOutline,
  swapHorizontalOutline,
  trashOutline,
  trendingDownOutline,
} from 'ionicons/icons';

import {
  Supplier,
  SuppliersService,
} from '../../services/suppliers/suppliers.service';

import {
  Obra,
  ObrasService,
} from '../../services/financial/obras.service';

import {
  StockBalance,
  StockDocument,
  StockDocumentPayload,
  StockLocation,
  StockMaterial,
  StockService,
} from '../../services/stock/stock.service';

type DocumentKind =
  | 'entries'
  | 'issues'
  | 'transfers';

type StatusFilter =
  | ''
  | 'RASCUNHO'
  | 'PENDENTE_APROVACAO'
  | 'APROVADO'
  | 'EFETIVADO'
  | 'CANCELADO'
  | 'ESTORNADO';

@Component({
  selector: 'app-stock-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './stock-documents.page.html',
  styleUrls: ['./stock-documents.page.scss'],
})
export class StockDocumentsPage implements OnInit {
  loading = true;
  saving = false;
  drawerOpen = false;

  search = '';
  statusFilter: StatusFilter = '';

  documents: StockDocument[] = [];
  filteredDocuments: StockDocument[] = [];

  issueBalances: StockBalance[] = [];
  issueBalancesLoading = false;

  transferDestinationBalances: StockBalance[] = [];
  transferDestinationLoading = false;

  kind: DocumentKind = 'entries';

  materials: StockMaterial[] = [];
  locations: StockLocation[] = [];
  suppliers: Supplier[] = [];
  obras: Obra[] = [];

  form: StockDocumentPayload =
    this.emptyForm();

  labels: Record<
    DocumentKind,
    {
      title: string;
      subtitle: string;
      singular: string;
      icon: string;
    }
  > = {
    entries: {
      title: 'Entradas de estoque',
      subtitle:
        'Recebimentos, compras e materiais incorporados ao estoque',
      singular: 'entrada',
      icon: 'archive-outline',
    },
    issues: {
      title: 'Saídas de estoque',
      subtitle:
        'Consumos, perdas, devoluções e baixas de materiais',
      singular: 'saída',
      icon: 'trending-down-outline',
    },
    transfers: {
      title: 'Transferências',
      subtitle:
        'Movimentações entre depósitos, obras e canteiros',
      singular: 'transferência',
      icon: 'swap-horizontal-outline',
    },
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly stock: StockService,
    private readonly suppliersService: SuppliersService,
    private readonly obrasService: ObrasService,
    private readonly toastController: ToastController,
  ) {
    addIcons({
      addOutline,
      archiveOutline,
      checkmarkCircleOutline,
      closeOutline,
      closeCircleOutline,
      copyOutline,
      cubeOutline,
      documentTextOutline,
      eyeOutline,
      playCircleOutline,
      refreshOutline,
      saveOutline,
      sendOutline,
      swapHorizontalOutline,
      trashOutline,
      trendingDownOutline,
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.kind = data['kind'] || 'entries';
      this.form = this.emptyForm();
      this.loadReferenceData();
      this.load();

      if (this.kind === 'transfers') {
        const materialId =
          this.route.snapshot.queryParamMap.get(
            'materialId',
          );

        const localOrigemId =
          this.route.snapshot.queryParamMap.get(
            'localOrigemId',
          );

        const localDestinoId =
          this.route.snapshot.queryParamMap.get(
            'localDestinoId',
          );

        if (
          materialId ||
          localOrigemId ||
          localDestinoId
        ) {
          if (materialId) {
            this.form.items[0].materialId =
              materialId;
          }

          if (localOrigemId) {
            this.form.localOrigemId =
              localOrigemId;
          }

          if (localDestinoId) {
            this.form.localDestinoId =
              localDestinoId;
          }

          this.drawerOpen = true;

          if (localOrigemId) {
            this.onOriginChange();
          }

          if (localDestinoId) {
            this.onDestinationChange();
          }
        }
      }
    });
  }

  loadReferenceData(): void {
    this.stock
      .getMaterials({ take: 500, ativo: true })
      .subscribe({
        next: (response) => {
          this.materials =
            response.items || [];
        },
      });

    this.stock
      .getLocations({ take: 500, ativo: true })
      .subscribe({
        next: (response) => {
          this.locations =
            response.items || [];
        },
      });

    this.suppliersService
      .findAll()
      .subscribe({
        next: (response) => {
          this.suppliers =
            response || [];
        },
      });

    this.obrasService
      .getAll()
      .subscribe({
        next: (response) => {
          this.obras =
            response || [];
        },
      });
  }

  load(): void {
    this.loading = true;

    this.stock
      .getDocuments(this.kind, {
        take: 500,
      })
      .subscribe({
        next: (response) => {
          this.documents =
            response.items || [];

          this.applyFilters();
          this.loading = false;
        },
        error: async () => {
          this.documents = [];
          this.filteredDocuments = [];
          this.loading = false;

          await this.toast(
            'Não foi possível carregar os documentos.',
            'danger',
          );
        },
      });
  }

  applyFilters(): void {
    const term = this.normalize(this.search);

    this.filteredDocuments =
      this.documents.filter((item) => {
        const searchMatch =
          !term ||
          [
            item.numero,
            item.status,
            item.fornecedor?.nome,
            item.obra?.nome,
            item.localOrigem?.nome,
            item.localDestino?.nome,
            item.observacao,
          ].some((value) =>
            this.normalize(value).includes(term),
          );

        const statusMatch =
          !this.statusFilter ||
          item.status === this.statusFilter;

        return searchMatch && statusMatch;
      });
  }

  openNew(): void {
    this.form = this.emptyForm();
    this.issueBalances = [];
    this.transferDestinationBalances = [];
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    if (this.saving) return;
    this.drawerOpen = false;
  }

  onOriginChange(): void {
    this.issueBalances = [];

    if (
      !['issues', 'transfers'].includes(
        this.kind,
      ) ||
      !this.form.localOrigemId
    ) {
      return;
    }

    this.issueBalancesLoading = true;

    this.stock
      .getBalances({
        localEstoqueId:
          this.form.localOrigemId,
        take: 1000,
      })
      .subscribe({
        next: (response) => {
          this.issueBalances =
            response.items || [];
          this.issueBalancesLoading = false;
        },
        error: async () => {
          this.issueBalances = [];
          this.issueBalancesLoading = false;

          await this.toast(
            'Não foi possível consultar o saldo do local selecionado.',
            'danger',
          );
        },
      });
  }

  getIssueBalance(item: any): StockBalance | undefined {
    if (
      !['issues', 'transfers'].includes(
        this.kind,
      ) ||
      !item?.materialId
    ) {
      return undefined;
    }

    return this.issueBalances.find(
      (balance) =>
        balance.materialId ===
        item.materialId,
    );
  }

  issuePhysical(item: any): number {
    return this.toNumber(
      this.getIssueBalance(item)?.quantidade,
    );
  }

  issueReserved(item: any): number {
    return this.toNumber(
      this.getIssueBalance(item)
        ?.quantidadeReservada,
    );
  }

  issueAvailable(item: any): number {
    return this.toNumber(
      this.getIssueBalance(item)
        ?.quantidadeDisponivel,
    );
  }

  issueProjected(item: any): number {
    return (
      this.issueAvailable(item) -
      this.toNumber(item?.quantidade)
    );
  }

  issueHasInsufficientStock(
    item: any,
  ): boolean {
    if (
      this.kind !== 'issues' ||
      !this.form.localOrigemId ||
      !item?.materialId
    ) {
      return false;
    }

    return (
      this.toNumber(item.quantidade) >
      this.issueAvailable(item)
    );
  }

  onDestinationChange(): void {
    this.transferDestinationBalances = [];

    if (
      this.kind !== 'transfers' ||
      !this.form.localDestinoId
    ) {
      return;
    }

    this.transferDestinationLoading = true;

    this.stock
      .getBalances({
        localEstoqueId:
          this.form.localDestinoId,
        take: 1000,
      })
      .subscribe({
        next: (response) => {
          this.transferDestinationBalances =
            response.items || [];

          this.transferDestinationLoading = false;
        },
        error: async () => {
          this.transferDestinationBalances = [];
          this.transferDestinationLoading = false;

          await this.toast(
            'Não foi possível consultar o saldo do destino.',
            'danger',
          );
        },
      });
  }

  getTransferDestinationBalance(
    item: any,
  ): StockBalance | undefined {
    if (
      this.kind !== 'transfers' ||
      !item?.materialId
    ) {
      return undefined;
    }

    return this.transferDestinationBalances.find(
      (balance) =>
        balance.materialId ===
        item.materialId,
    );
  }

  transferDestinationPhysical(
    item: any,
  ): number {
    return this.toNumber(
      this.getTransferDestinationBalance(item)
        ?.quantidade,
    );
  }

  transferOriginProjected(
    item: any,
  ): number {
    return (
      this.issueAvailable(item) -
      this.toNumber(item?.quantidade)
    );
  }

  transferDestinationProjected(
    item: any,
  ): number {
    return (
      this.transferDestinationPhysical(item) +
      this.toNumber(item?.quantidade)
    );
  }

  transferHasInsufficientStock(
    item: any,
  ): boolean {
    if (
      this.kind !== 'transfers' ||
      !this.form.localOrigemId ||
      !item?.materialId
    ) {
      return false;
    }

    return (
      this.toNumber(item.quantidade) >
      this.issueAvailable(item)
    );
  }

  addItem(): void {
    this.form.items.push({
      materialId: '',
      quantidade: '1',
      custoUnitario:
        this.kind === 'entries'
          ? '0'
          : undefined,
      lote: null,
      dataValidade: null,
      observacao: null,
    });
  }

  duplicateItem(index: number): void {
    this.form.items.splice(
      index + 1,
      0,
      {
        ...this.form.items[index],
      },
    );
  }

  removeItem(index: number): void {
    if (this.form.items.length === 1) {
      return;
    }

    this.form.items.splice(index, 1);
  }

  save(): void {
    if (!this.isValid()) return;

    this.saving = true;

    const payload: StockDocumentPayload = {
      numero:
        this.form.numero?.trim() ||
        undefined,

      fornecedorId:
        this.kind === 'entries'
          ? this.form.fornecedorId ||
            undefined
          : undefined,

      obraId:
        this.form.obraId || undefined,

      localOrigemId:
        this.kind !== 'entries'
          ? this.form.localOrigemId ||
            undefined
          : undefined,

      localDestinoId:
        this.kind !== 'issues'
          ? this.form.localDestinoId ||
            undefined
          : undefined,

      dataDocumento:
        this.form.dataDocumento,

      documentoFiscal:
        this.form.documentoFiscal?.trim() ||
        undefined,

      observacao:
        this.form.observacao?.trim() ||
        undefined,

      items: this.form.items.map(
        (item) => ({
          materialId: item.materialId,
          quantidade: item.quantidade,

          custoUnitario:
            this.kind === 'entries'
              ? item.custoUnitario || '0'
              : item.custoUnitario,

          lote:
            item.lote?.trim() || null,

          dataValidade:
            item.dataValidade || null,

          observacao:
            item.observacao?.trim() ||
            null,
        }),
      ),
    };

    this.stock
      .createDocument(this.kind, payload)
      .subscribe({
        next: async () => {
          this.saving = false;
          this.drawerOpen = false;
          this.form = this.emptyForm();
          this.load();

          await this.toast(
            `${this.capitalize(
              this.labels[this.kind].singular,
            )} salva como rascunho.`,
            'success',
          );
        },

        error: async (error) => {
          this.saving = false;

          const message =
            error?.error?.message ||
            'Não foi possível salvar o documento.';

          await this.toast(
            Array.isArray(message)
              ? message.join(', ')
              : message,
            'danger',
          );
        },
      });
  }

  isValid(): boolean {
    const hasItems =
      this.form.items.length > 0 &&
      this.form.items.every(
        (item) =>
          !!item.materialId &&
          Number(item.quantidade) > 0 &&
          (
            this.kind !== 'entries' ||
            Number(item.custoUnitario || 0) >= 0
          ),
      );

    if (!hasItems) return false;

    if (this.kind === 'entries') {
      return !!this.form.localDestinoId;
    }

    if (this.kind === 'issues') {
      if (!this.form.localOrigemId) {
        return false;
      }

      return this.form.items.every(
        (item) =>
          !this.issueHasInsufficientStock(
            item,
          ),
      );
    }

    return (
      !!this.form.localOrigemId &&
      !!this.form.localDestinoId &&
      this.form.localOrigemId !==
        this.form.localDestinoId &&
      this.form.items.every(
        (item) =>
          !this.transferHasInsufficientStock(
            item,
          ),
      )
    );
  }

  submit(document: StockDocument): void {
    if (this.kind === 'transfers') return;

    this.stock
      .submitDocument(
        this.kind,
        document.id,
      )
      .subscribe({
        next: async () => {
          this.load();
          await this.toast(
            'Documento enviado para aprovação.',
            'success',
          );
        },
      });
  }

  approve(document: StockDocument): void {
    if (this.kind === 'transfers') return;

    this.stock
      .approveDocument(
        this.kind,
        document.id,
      )
      .subscribe({
        next: async () => {
          this.load();
          await this.toast(
            'Documento aprovado.',
            'success',
          );
        },
      });
  }

  post(document: StockDocument): void {
    const confirmed = window.confirm(
      this.kind === 'entries'
        ? 'Efetivar esta entrada? O saldo de estoque será atualizado.'
        : 'Efetivar este documento?',
    );

    if (!confirmed) return;

    this.stock
      .postDocument(
        this.kind,
        document.id,
      )
      .subscribe({
        next: async () => {
          this.load();

          await this.toast(
            this.kind === 'entries'
              ? 'Entrada efetivada e estoque atualizado.'
              : 'Documento efetivado.',
            'success',
          );
        },
        error: async (error) => {
          const message =
            error?.error?.message ||
            'Não foi possível efetivar o documento.';

          await this.toast(
            Array.isArray(message)
              ? message.join(', ')
              : message,
            'danger',
          );
        },
      });
  }

  cancel(document: StockDocument): void {
    const motivo = window.prompt(
      document.status === 'EFETIVADO'
        ? 'Informe o motivo do estorno:'
        : 'Informe o motivo do cancelamento:',
    );

    if (!motivo?.trim()) return;

    this.stock
      .cancelDocument(
        this.kind,
        document.id,
        motivo.trim(),
      )
      .subscribe({
        next: async () => {
          this.load();

          await this.toast(
            document.status === 'EFETIVADO'
              ? 'Documento estornado.'
              : 'Documento cancelado.',
            'success',
          );
        },
      });
  }

  openDetail(document: StockDocument): void {
    this.router.navigate([
      '/stock',
      this.kind,
      document.id,
    ]);
  }

  canSubmit(
    document: StockDocument,
  ): boolean {
    return (
      this.kind !== 'transfers' &&
      document.status === 'RASCUNHO'
    );
  }

  canApprove(
    document: StockDocument,
  ): boolean {
    return (
      this.kind !== 'transfers' &&
      [
        'RASCUNHO',
        'PENDENTE_APROVACAO',
      ].includes(document.status)
    );
  }

  canPost(
    document: StockDocument,
  ): boolean {
    return [
      'RASCUNHO',
      'APROVADO',
    ].includes(document.status);
  }

  canCancel(
    document: StockDocument,
  ): boolean {
    return ![
      'CANCELADO',
      'ESTORNADO',
    ].includes(document.status);
  }

  get totalDocuments(): number {
    return this.documents.length;
  }

  get draftDocuments(): number {
    return this.documents.filter(
      (item) =>
        item.status === 'RASCUNHO',
    ).length;
  }

  get pendingDocuments(): number {
    return this.documents.filter(
      (item) =>
        item.status ===
        'PENDENTE_APROVACAO',
    ).length;
  }

  get postedDocuments(): number {
    return this.documents.filter(
      (item) =>
        item.status === 'EFETIVADO',
    ).length;
  }

  get postedValue(): number {
    return this.documents
      .filter(
        (item) =>
          item.status === 'EFETIVADO',
      )
      .reduce(
        (total, item) =>
          total +
          this.toNumber(item.valorTotal),
        0,
      );
  }

  get formTotal(): number {
    return this.form.items.reduce(
      (total, item) =>
        total +
        this.itemTotal(item),
      0,
    );
  }

  itemTotal(item: any): number {
    return (
      this.toNumber(item.quantidade) *
      this.toNumber(item.custoUnitario)
    );
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      RASCUNHO: 'Rascunho',
      PENDENTE_APROVACAO:
        'Aguardando aprovação',
      APROVADO: 'Aprovado',
      EFETIVADO: 'Efetivado',
      CANCELADO: 'Cancelado',
      ESTORNADO: 'Estornado',
    };

    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status
      .toLowerCase()
      .replace(/_/g, '-')}`;
  }

  supplierName(document: StockDocument): string {
    return (
      document.fornecedor?.nome ||
      'Sem fornecedor'
    );
  }

  private emptyForm(): StockDocumentPayload {
    return {
      dataDocumento:
        new Date()
          .toISOString()
          .slice(0, 10),

      items: [
        {
          materialId: '',
          quantidade: '1',
          custoUnitario:
            this.kind === 'entries'
              ? '0'
              : undefined,
          lote: null,
          dataValidade: null,
          observacao: null,
        },
      ],
    };
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private toNumber(
    value: string | number | undefined | null,
  ): number {
    const number = Number(value || 0);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  private capitalize(value: string): string {
    if (!value) return value;

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }

  private async toast(
    message: string,
    color: string,
  ): Promise<void> {
    const toast =
      await this.toastController.create({
        message,
        color,
        duration: 2500,
        position: 'bottom',
      });

    await toast.present();
  }
}
