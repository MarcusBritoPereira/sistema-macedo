import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea } from '@ionic/angular/standalone';
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
  mode: 'requests' | 'reservations' = 'requests';
  rows: any[] = [];
  obras: Obra[] = [];
  locations: StockLocation[] = [];
  materials: StockMaterial[] = [];
  priorities = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
  form: StockRequestPayload = this.emptyForm();
  selectedRequest: any = null;
  approvalForm: ApproveStockRequestPayload = this.emptyApprovalForm();
  fulfillmentForm: FulfillStockRequestPayload = this.emptyFulfillmentForm();

  constructor(private route: ActivatedRoute, private stock: StockService, private obrasService: ObrasService) {
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
    this.stock.getLocations({ take: 500, ativo: true }).subscribe({ next: r => this.locations = r.items || [] });
    this.stock.getMaterials({ take: 500, ativo: true }).subscribe({ next: r => this.materials = r.items || [] });
  }

  load(): void {
    this.loading = true;
    const request = this.mode === 'reservations' ? this.stock.getReservations({ take: 100, search: this.search }) : this.stock.getRequests({ take: 100, search: this.search });
    request.subscribe({ next: r => { this.rows = r.items || []; this.loading = false; }, error: () => this.loading = false });
  }

  addItem(): void { this.form.items.push({ materialId: '', quantidadeSolicitada: '1' }); }
  duplicateItem(index: number): void { this.form.items.splice(index + 1, 0, { ...this.form.items[index] }); }
  removeItem(index: number): void { if (this.form.items.length > 1) this.form.items.splice(index, 1); }

  save(): void {
    if (!this.isValid()) return;
    this.saving = true;
    this.stock.createRequest(this.form).subscribe({
      next: () => { this.form = this.emptyForm(); this.saving = false; this.load(); },
      error: () => this.saving = false
    });
  }

  isValid(): boolean {
    return !!this.form.obraId && this.form.items.every(item => item.materialId && Number(item.quantidadeSolicitada) > 0);
  }

  reset(): void { this.form = this.emptyForm(); }



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
      next: () => { this.clearWorkflowForms(); this.load(); }
    });
  }

  rejectSelected(): void {
    if (!this.selectedRequest) return;
    const motivo = window.prompt('Informe o motivo da rejeição:');
    if (!motivo) return;
    this.stock.rejectRequest(this.selectedRequest.id, motivo).subscribe({
      next: () => { this.clearWorkflowForms(); this.load(); }
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
      next: () => { this.clearWorkflowForms(); this.load(); }
    });
  }

  clearWorkflowForms(): void {
    this.selectedRequest = null;
    this.approvalForm = this.emptyApprovalForm();
    this.fulfillmentForm = this.emptyFulfillmentForm();
  }

  submit(row: any): void {
    this.stock.submitRequest(row.id).subscribe({ next: () => this.load() });
  }

  cancel(row: any): void {
    if (!window.confirm('Cancelar esta solicitação?')) return;
    this.stock.cancelRequest(row.id).subscribe({ next: () => this.load() });
  }

  canSubmit(row: any): boolean {
    return this.mode === 'requests' && row.status === 'RASCUNHO';
  }

  canCancel(row: any): boolean {
    return this.mode === 'requests' && !['CANCELADA', 'ATENDIDA'].includes(row.status);
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
