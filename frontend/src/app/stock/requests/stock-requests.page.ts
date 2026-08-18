import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, checkmarkCircleOutline, closeCircleOutline, listOutline, playCircleOutline, refreshOutline, saveOutline, sendOutline, trashOutline } from 'ionicons/icons';
import { Obra, ObrasService } from '../../services/financial/obras.service';
import { ApproveStockRequestPayload, FulfillStockRequestPayload, StockLocation, StockMaterial, StockRequestPayload, StockService } from '../../services/stock/stock.service';

@Component({
  selector: 'app-stock-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea],
  templateUrl: './stock-requests.page.html',
  styleUrls: ['./stock-requests.page.scss']
})
export class StockRequestsPage implements OnInit {
  loading = true;
  saving = false;
  search = '';
  statusFilter = '';
  mode: 'requests' | 'reservations' = 'requests';
  rows: any[] = [];

  drawerOpen = false;
  obras: Obra[] = [];
  locations: StockLocation[] = [];
  materials: StockMaterial[] = [];
  priorities = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
  form: StockRequestPayload = this.emptyForm();
  selectedRequest: any = null;
  approvalForm: ApproveStockRequestPayload = this.emptyApprovalForm();
  fulfillmentForm: FulfillStockRequestPayload = this.emptyFulfillmentForm();

  constructor(
    private route: ActivatedRoute,
    private stock: StockService,
    private obrasService: ObrasService,
    private toastController: ToastController,
  ) {
    addIcons({ addOutline, checkmarkCircleOutline, closeCircleOutline, listOutline, playCircleOutline, refreshOutline, saveOutline, sendOutline, trashOutline });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.mode = data['mode'] || 'requests';
      this.loadReferenceData();
      this.load();
    });
  }

  loadReferenceData(): void {
    this.obrasService.getAll().subscribe({ next: r => this.obras = r || [] });
    this.stock.getLocations({ take: 5000, ativo: true }).subscribe({ next: r => this.locations = r.items || [] });
    this.stock.getMaterials({ take: 5000, ativo: true }).subscribe({ next: r => this.materials = r.items || [] });
  }

  load(): void {
    this.loading = true;

    const params: any = {
      take: 100,
      search: this.search?.trim() || undefined,
    };

    if (this.statusFilter) {
      params.status = this.statusFilter;
    }

    const request =
      this.mode === 'reservations'
        ? this.stock.getReservations(params)
        : this.stock.getRequests(params);

    request.subscribe({
      next: (response) => {
        this.rows = response.items || [];
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        await this.toast(
          'Não foi possível carregar os registros.',
          'danger',
        );
      },
    });
  }

  addItem(): void { this.form.items.push({ materialId: '', quantidadeSolicitada: '1' }); }
  duplicateItem(index: number): void { this.form.items.splice(index + 1, 0, { ...this.form.items[index] }); }
  removeItem(index: number): void { if (this.form.items.length > 1) this.form.items.splice(index, 1); }

  save(): void {
    if (!this.isValid()) return;

    this.saving = true;

    this.stock.createRequest(this.form).subscribe({
      next: async () => {
        this.form = this.emptyForm();
        this.saving = false;
        this.drawerOpen = false;
        this.load();

        await this.toast(
          'Solicitação criada com sucesso.',
          'success',
        );
      },
      error: async (error) => {
        this.saving = false;

        await this.toast(
          error?.error?.message ||
            'Não foi possível criar a solicitação.',
          'danger',
        );
      },
    });
  }

  isValid(): boolean {
    return !!this.form.obraId && this.form.items.every(item => item.materialId && Number(item.quantidadeSolicitada) > 0);
  }

  reset(): void {
    this.form = this.emptyForm();
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.form = this.emptyForm();
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.load();
  }

  get totalRequests(): number {
    return this.rows.length;
  }

  get pendingRequests(): number {
    return this.rows.filter(
      (row) =>
        ![
          'ATENDIDA',
          'CANCELADA',
          'REJEITADA',
        ].includes(row.status),
    ).length;
  }

  get approvedRequests(): number {
    return this.rows.filter(
      (row) =>
        [
          'APROVADA',
          'PARCIALMENTE_APROVADA',
          'SEPARACAO',
        ].includes(row.status),
    ).length;
  }

  get fulfilledRequests(): number {
    return this.rows.filter(
      (row) => row.status === 'ATENDIDA',
    ).length;
  }

  get activeReservations(): number {
    return this.rows.filter(
      (row) =>
        [
          'PENDENTE',
          'APROVADA',
          'PARCIALMENTE_ATENDIDA',
        ].includes(row.status),
    ).length;
  }

  get activeReservedQuantity(): number {
    return this.rows
      .filter(
        (row) =>
          [
            'PENDENTE',
            'APROVADA',
            'PARCIALMENTE_ATENDIDA',
          ].includes(row.status),
      )
      .reduce(
        (total: number, row: any) =>
          total + Number(row.quantidade || 0),
        0,
      );
  }

  get attendedReservations(): number {
    return this.rows.filter(
      (row) => row.status === 'ATENDIDA',
    ).length;
  }

  get canceledReservations(): number {
    return this.rows.filter(
      (row) => row.status === 'CANCELADA',
    ).length;
  }

  get expiredReservations(): number {
    return this.rows.filter(
      (row) => row.status === 'EXPIRADA',
    ).length;
  }

  requestRequested(row: any): number {
    return (row?.itens || []).reduce(
      (total: number, item: any) =>
        total +
        Number(
          item.quantidadeSolicitada || 0,
        ),
      0,
    );
  }

  requestApproved(row: any): number {
    return (row?.itens || []).reduce(
      (total: number, item: any) =>
        total +
        Number(
          item.quantidadeAprovada || 0,
        ),
      0,
    );
  }

  requestFulfilled(row: any): number {
    return (row?.itens || []).reduce(
      (total: number, item: any) =>
        total +
        Number(
          item.quantidadeAtendida || 0,
        ),
      0,
    );
  }

  requestPending(row: any): number {
    return Math.max(
      0,
      this.requestApproved(row) -
        this.requestFulfilled(row),
    );
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      RASCUNHO: 'Rascunho',
      ENVIADA: 'Enviada',
      EM_ANALISE: 'Em análise',
      APROVADA: 'Aprovada',
      PARCIALMENTE_APROVADA:
        'Parcialmente aprovada',
      SEPARACAO: 'Em separação',
      PARCIALMENTE_ATENDIDA:
        'Parcialmente atendida',
      ATENDIDA: 'Atendida',
      REJEITADA: 'Rejeitada',
      CANCELADA: 'Cancelada',
      EXPIRADA: 'Expirada',
    };

    return labels[status] || status || '—';
  }

  getStatusClass(status: string): string {
    return `status-${String(status || '')
      .toLowerCase()
      .replace(/_/g, '-')}`;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      BAIXA: 'Baixa',
      NORMAL: 'Normal',
      ALTA: 'Alta',
      URGENTE: 'Urgente',
    };

    return labels[priority] || priority || '—';
  }

  prepareApproval(row: any): void {
    this.selectedRequest = row;
    this.approvalForm = {
      localReservaId: row.localDestinoId || this.locations[0]?.id || '',
      observacao: row.observacao || '',
      items: (row.itens || []).map((item: any) => ({
        itemId: item.id,
        quantidadeAprovada: item.quantidadeAprovada || item.quantidadeSolicitada || '0'
      }))
    };
    this.fulfillmentForm = this.emptyFulfillmentForm();
  }

  approveSelected(): void {
    if (!this.selectedRequest || !this.approvalForm.localReservaId) return;
    this.stock.approveRequest(this.selectedRequest.id, this.approvalForm).subscribe({
      next: async () => {
        this.clearWorkflowForms();
        this.load();
        await this.toast(
          'Solicitação aprovada e reserva criada.',
          'success',
        );
      },
      error: async (error) => {
        await this.toast(
          error?.error?.message ||
            'Não foi possível aprovar a solicitação.',
          'danger',
        );
      },
    });
  }

  rejectSelected(): void {
    if (!this.selectedRequest) return;
    const motivo = window.prompt('Informe o motivo da rejeição:');
    if (!motivo) return;
    this.stock.rejectRequest(this.selectedRequest.id, motivo).subscribe({
      next: async () => {
        this.clearWorkflowForms();
        this.load();
        await this.toast(
          'Solicitação rejeitada.',
          'success',
        );
      },
      error: async (error) => {
        await this.toast(
          error?.error?.message ||
            'Não foi possível rejeitar a solicitação.',
          'danger',
        );
      },
    });
  }

  prepareFulfillment(row: any): void {
    this.selectedRequest = row;
    this.fulfillmentForm = { localOrigemId: this.locations[0]?.id || '', observacao: row.observacao || '' };
    this.approvalForm = this.emptyApprovalForm();
  }

  fulfillSelected(): void {
    if (!this.selectedRequest || !this.fulfillmentForm.localOrigemId) return;
    this.stock.fulfillRequest(this.selectedRequest.id, this.fulfillmentForm).subscribe({
      next: async () => {
        this.clearWorkflowForms();
        this.load();
        await this.toast(
          'Solicitação atendida com sucesso.',
          'success',
        );
      },
      error: async (error) => {
        await this.toast(
          error?.error?.message ||
            'Não foi possível atender a solicitação.',
          'danger',
        );
      },
    });
  }

  clearWorkflowForms(): void {
    this.selectedRequest = null;
    this.approvalForm = this.emptyApprovalForm();
    this.fulfillmentForm = this.emptyFulfillmentForm();
  }

  submit(row: any): void {
    this.stock.submitRequest(row.id).subscribe({
      next: async () => {
        this.load();

        await this.toast(
          'Solicitação enviada para análise.',
          'success',
        );
      },
      error: async (error) => {
        await this.toast(
          error?.error?.message ||
            'Não foi possível enviar a solicitação.',
          'danger',
        );
      },
    });
  }

  cancel(row: any): void {
    if (
      !window.confirm(
        'Cancelar esta solicitação? As reservas ainda pendentes serão liberadas.',
      )
    ) {
      return;
    }

    this.stock.cancelRequest(row.id).subscribe({
      next: async () => {
        this.load();

        await this.toast(
          'Solicitação cancelada e reservas liberadas.',
          'success',
        );
      },
      error: async (error) => {
        await this.toast(
          error?.error?.message ||
            'Não foi possível cancelar a solicitação.',
          'danger',
        );
      },
    });
  }

  canSubmit(row: any): boolean {
    return this.mode === 'requests' && row.status === 'RASCUNHO';
  }

  canCancel(row: any): boolean {
    return (
      this.mode === 'requests' &&
      ![
        'CANCELADA',
        'ATENDIDA',
        'REJEITADA',
      ].includes(row.status)
    );
  }

  canApprove(row: any): boolean {
    return this.mode === 'requests' && ['RASCUNHO', 'ENVIADA', 'EM_ANALISE'].includes(row.status);
  }

  canFulfill(row: any): boolean {
    return this.mode === 'requests' && ['APROVADA', 'PARCIALMENTE_APROVADA', 'SEPARACAO'].includes(row.status);
  }

  getSelectedItemLabel(itemId: string): string {
    const item = this.selectedRequest?.itens?.find((row: any) => row.id === itemId);
    return item ? `${item.material?.codigo || ''} ${item.material?.nome || ''}`.trim() : itemId;
  }

  private async toast(
    message: string,
    color:
      | 'success'
      | 'danger'
      | 'warning'
      | 'primary' = 'primary',
  ): Promise<void> {
    const toast =
      await this.toastController.create({
        message,
        color,
        duration: 3500,
        position: 'top',
      });

    await toast.present();
  }

  private emptyApprovalForm(): ApproveStockRequestPayload {
    return { localReservaId: '', observacao: '', items: [] };
  }

  private emptyFulfillmentForm(): FulfillStockRequestPayload {
    return { localOrigemId: '', observacao: '' };
  }

  private emptyForm(): StockRequestPayload {
    return { obraId: '', prioridade: 'NORMAL', dataNecessidade: new Date().toISOString().slice(0, 10), items: [{ materialId: '', quantidadeSolicitada: '1' }] };
  }
}
