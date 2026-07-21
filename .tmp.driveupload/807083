import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, archiveOutline, checkmarkCircleOutline, closeCircleOutline, playCircleOutline, refreshOutline, saveOutline, sendOutline, swapHorizontalOutline, trashOutline, trendingDownOutline } from 'ionicons/icons';
import { Supplier, SuppliersService } from '../../services/suppliers/suppliers.service';
import { Obra, ObrasService } from '../../services/financial/obras.service';
import { StockDocument, StockDocumentPayload, StockLocation, StockMaterial, StockService } from '../../services/stock/stock.service';

type DocumentKind = 'entries' | 'issues' | 'transfers';

interface StockDocumentItemForm {
  materialId: string;
  quantidade: string;
  custoUnitario?: string;
  observacao?: string;
}

@Component({
  selector: 'app-stock-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, RouterLink, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTextarea],
  templateUrl: './stock-documents.page.html',
  styleUrls: ['./stock-documents.page.scss']
})
export class StockDocumentsPage implements OnInit {
  loading = true;
  saving = false;
  search = '';
  documents: StockDocument[] = [];
  kind: DocumentKind = 'entries';
  materials: StockMaterial[] = [];
  locations: StockLocation[] = [];
  suppliers: Supplier[] = [];
  obras: Obra[] = [];
  form: StockDocumentPayload = this.emptyForm();

  labels: Record<DocumentKind, { title: string; subtitle: string; icon: string }> = {
    entries: { title: 'Entradas de material', subtitle: 'Compras, devoluções, doações e ajustes de entrada', icon: 'archive-outline' },
    issues: { title: 'Saídas de material', subtitle: 'Consumos, perdas, devoluções e ajustes de saída', icon: 'trending-down-outline' },
    transfers: { title: 'Transferências', subtitle: 'Movimentações entre depósitos, obras e canteiros', icon: 'swap-horizontal-outline' }
  };

  constructor(
    private route: ActivatedRoute,
    private stock: StockService,
    private suppliersService: SuppliersService,
    private obrasService: ObrasService
  ) {
    addIcons({ addOutline, archiveOutline, checkmarkCircleOutline, closeCircleOutline, playCircleOutline, refreshOutline, saveOutline, sendOutline, swapHorizontalOutline, trashOutline, trendingDownOutline });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.kind = data['kind'] || 'entries';
      this.form = this.emptyForm();
      this.loadReferenceData();
      this.load();
    });
  }

  loadReferenceData(): void {
    this.stock.getMaterials({ take: 500, ativo: true }).subscribe({ next: r => this.materials = r.items || [] });
    this.stock.getLocations({ take: 500, ativo: true }).subscribe({ next: r => this.locations = r.items || [] });
    this.suppliersService.findAll().subscribe({ next: r => this.suppliers = r || [] });
    this.obrasService.getAll().subscribe({ next: r => this.obras = r || [] });
  }

  load(): void {
    this.loading = true;
    this.stock.getDocuments(this.kind, { take: 100, search: this.search }).subscribe({
      next: r => { this.documents = r.items || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  addItem(): void {
    this.form.items.push({ materialId: '', quantidade: '1', custoUnitario: this.kind === 'entries' ? '0' : undefined });
  }

  duplicateItem(index: number): void {
    this.form.items.splice(index + 1, 0, { ...this.form.items[index] });
  }

  removeItem(index: number): void {
    if (this.form.items.length === 1) return;
    this.form.items.splice(index, 1);
  }

  save(): void {
    if (!this.isValid()) return;
    this.saving = true;
    const payload: StockDocumentPayload = {
      ...this.form,
      fornecedorId: this.kind === 'entries' ? this.form.fornecedorId || undefined : undefined,
      localOrigemId: this.kind !== 'entries' ? this.form.localOrigemId || undefined : undefined,
      localDestinoId: this.kind !== 'issues' ? this.form.localDestinoId || undefined : undefined,
      items: this.form.items.map(item => ({
        materialId: item.materialId,
        quantidade: item.quantidade,
        custoUnitario: this.kind === 'entries' ? item.custoUnitario || '0' : item.custoUnitario,
        observacao: item.observacao
      }))
    };
    this.stock.createDocument(this.kind, payload).subscribe({
      next: () => { this.form = this.emptyForm(); this.saving = false; this.load(); },
      error: () => this.saving = false
    });
  }

  isValid(): boolean {
    const hasItems = this.form.items.every(item => item.materialId && Number(item.quantidade) > 0);
    if (!hasItems) return false;
    if (this.kind === 'entries') return !!this.form.localDestinoId;
    if (this.kind === 'issues') return !!this.form.localOrigemId;
    return !!this.form.localOrigemId && !!this.form.localDestinoId && this.form.localOrigemId !== this.form.localDestinoId;
  }

  reset(): void { this.form = this.emptyForm(); }


  submit(document: StockDocument): void {
    if (this.kind === 'transfers') return;
    this.stock.submitDocument(this.kind, document.id).subscribe({ next: () => this.load() });
  }

  approve(document: StockDocument): void {
    if (this.kind === 'transfers') return;
    this.stock.approveDocument(this.kind, document.id).subscribe({ next: () => this.load() });
  }

  post(document: StockDocument): void {
    this.stock.postDocument(this.kind, document.id).subscribe({ next: () => this.load() });
  }

  cancel(document: StockDocument): void {
    const motivo = window.prompt('Informe o motivo do cancelamento/estorno:');
    if (!motivo) return;
    this.stock.cancelDocument(this.kind, document.id, motivo).subscribe({ next: () => this.load() });
  }

  canSubmit(document: StockDocument): boolean {
    return this.kind !== 'transfers' && document.status === 'RASCUNHO';
  }

  canApprove(document: StockDocument): boolean {
    return this.kind !== 'transfers' && ['RASCUNHO', 'PENDENTE_APROVACAO'].includes(document.status);
  }

  canPost(document: StockDocument): boolean {
    return ['RASCUNHO', 'APROVADO'].includes(document.status);
  }

  canCancel(document: StockDocument): boolean {
    return !['CANCELADO', 'ESTORNADO'].includes(document.status);
  }

  private emptyForm(): StockDocumentPayload {
    return { dataDocumento: new Date().toISOString().slice(0, 10), items: [{ materialId: '', quantidade: '1', custoUnitario: this.kind === 'entries' ? '0' : undefined }] };
  }
}
