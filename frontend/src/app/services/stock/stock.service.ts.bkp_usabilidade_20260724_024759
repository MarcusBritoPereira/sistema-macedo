import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';

export interface StockListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

export interface StockCategory {
  id?: string;
  nome: string;
  descricao?: string | null;
  parentId?: string | null;
  categoriaFinanceiraId?: string | null;
  centroCustoPadraoId?: string | null;
  ativo?: boolean;
}

export interface StockMaterial {
  id?: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  categoriaMaterialId: string;
  categoriaMaterial?: StockCategory;
  unidade: string;
  codigoBarras?: string | null;
  referenciaFornecedor?: string | null;
  marca?: string | null;
  fabricante?: string | null;
  estoqueMinimo?: string | number;
  estoqueMaximo?: string | number | null;
  pontoReposicao?: string | number;
  custoPadrao?: string | number | null;
  ultimoCusto?: string | number;
  custoMedio?: string | number;
  permiteFracionado?: boolean;
  ativo?: boolean;
  observacoes?: string | null;
  saldoTotal?: string | number;
  valorTotalEstoque?: string | number;
}

export interface StockLocation {
  id?: string;
  nome: string;
  codigo: string;
  tipo: string;
  obraId?: string | null;
  responsavelId?: string | null;
  endereco?: string | null;
  permiteSaldoNegativo?: boolean;
  ativo?: boolean;
  obra?: { id: string; nome: string } | null;
}

export interface StockBalance {
  id: string;
  materialId: string;
  localEstoqueId: string;
  material: StockMaterial;
  localEstoque: StockLocation;
  quantidade: string | number;
  quantidadeReservada: string | number;
  quantidadeDisponivel: string | number;
  custoMedio: string | number;
  valorTotal: string | number;
  situacao: 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERADO' | 'NEGATIVO';
}

export interface StockSummary {
  valorTotalEstoque: string | number;
  quantidadeFisica: string | number;
  quantidadeReservada: string | number;
  materiaisCadastrados: number;
  materiaisAbaixoMinimo: number;
}

export interface StockDocumentItemPayload {
  materialId: string;
  quantidade: string | number;
  custoUnitario?: string | number;
  lote?: string | null;
  dataValidade?: string | null;
  observacao?: string | null;
}

export interface StockDocumentPayload {
  numero?: string;
  fornecedorId?: string | null;
  obraId?: string | null;
  localOrigemId?: string | null;
  localDestinoId?: string | null;
  dataDocumento?: string;
  documentoFiscal?: string | null;
  observacao?: string | null;
  transacaoFinanceiraId?: string | null;
  items: StockDocumentItemPayload[];
}

export interface StockDocument {
  id: string;
  numero: string;
  tipo: string;
  status: string;
  fornecedor?: { id: string; nome: string } | null;
  obra?: { id: string; nome: string } | null;
  localOrigem?: StockLocation | null;
  localDestino?: StockLocation | null;
  dataDocumento: string;
  valorTotal: string | number;
  observacao?: string | null;
}

export interface StockRequestItemPayload {
  materialId: string;
  quantidadeSolicitada: string | number;
  observacao?: string | null;
}

export interface StockRequestPayload {
  obraId: string;
  localDestinoId?: string | null;
  prioridade?: string;
  dataNecessidade?: string | null;
  justificativa?: string | null;
  observacao?: string | null;
  items: StockRequestItemPayload[];
}


export interface ApproveStockRequestPayload {
  localReservaId: string;
  observacao?: string | null;
  items: Array<{ itemId: string; quantidadeAprovada: string | number }>;
}

export interface FulfillStockRequestPayload {
  localOrigemId: string;
  observacao?: string | null;
}

export interface StockRequest {
  id: string;
  numero: string;
  status: string;
  prioridade: string;
  obra?: { id: string; nome: string } | null;
  dataNecessidade?: string | null;
  solicitante?: { id: string; nome: string } | null;
  observacao?: string | null;
}

export interface StockInventoryItem {
  id: string;
  materialId: string;
  material: StockMaterial;
  quantidadeSistema: string | number;
  quantidadeContada: string | number;
  diferenca: string | number;
  custoMedio: string | number;
  valorDiferenca: string | number;
  justificativa?: string | null;
}

export interface StockInventory {
  id: string;
  status: string;
  localEstoqueId: string;
  localEstoque?: StockLocation;
  dataAbertura: string;
  dataFechamento?: string | null;
  observacao?: string | null;
  criadoPor?: { id: string; nome: string } | null;
  aprovadoPor?: { id: string; nome: string } | null;
  itens?: StockInventoryItem[];
  _count?: { itens: number };
}

export interface StockInventoryPayload {
  localEstoqueId: string;
  observacao?: string | null;
}

export interface CountStockInventoryPayload {
  items: Array<{ materialId: string; quantidadeContada: string | number; justificativa?: string | null }>;
}

export interface StockBudgetItemPayload {
  materialId: string;
  categoriaMaterialId?: string | null;
  quantidadeOrcada: string | number;
  custoUnitarioOrcado: string | number;
  etapaObra?: string | null;
  centroCustoId?: string | null;
  observacao?: string | null;
}

export interface StockBudgetPayload {
  obraId: string;
  versao?: number;
  dataReferencia: string;
  observacao?: string | null;
  items: StockBudgetItemPayload[];
}

export interface StockBudget {
  id: string;
  obraId: string;
  obra?: { id: string; nome: string } | null;
  versao: number;
  status: string;
  dataReferencia: string;
  observacao?: string | null;
  itens?: Array<StockBudgetItemPayload & { id: string; material?: StockMaterial; custoTotalOrcado: string | number }>;
  _count?: { itens: number };
}

export interface StockActualVsBudget {
  budget: { id: string; obra: any; versao: number; status: string; dataReferencia: string };
  totals: { quantidadeOrcada: string; quantidadeConsumida: string; custoOrcado: string; custoReal: string; desvioCusto: string };
  items: Array<{
    materialId: string;
    codigo: string;
    material: string;
    categoria?: string | null;
    etapaObra?: string | null;
    centroCusto?: string | null;
    quantidadeOrcada: string;
    quantidadeConsumida: string;
    diferencaQuantidade: string;
    percentualQuantidade: string;
    custoOrcado: string;
    custoReal: string;
    desvioCusto: string;
    percentualCusto: string;
    situacao: string;
  }>;
}

export interface StockReportResponse {
  items?: any[];
  total?: number;
  skip?: number;
  take?: number;
  filename?: string;
  mimeType?: string;
  content?: string;
}

export type StockReportKind = 'position' | 'movements' | 'consumption-by-project' | 'losses' | 'abc' | 'purchase-suggestion';

@Injectable({ providedIn: 'root' })
export class StockService {
  constructor(private api: ApiService) {}

  getSummary(): Observable<StockSummary> {
    return this.api.get<StockSummary>('stock/balances/summary');
  }

  getLowStock(params: any = {}): Observable<StockListResponse<StockBalance>> {
    return this.api.get<StockListResponse<StockBalance>>('stock/balances/low-stock', params);
  }

  getBalances(params: any = {}): Observable<StockListResponse<StockBalance>> {
    return this.api.get<StockListResponse<StockBalance>>('stock/balances', params);
  }

  getCategories(params: any = {}): Observable<StockListResponse<StockCategory>> {
    return this.api.get<StockListResponse<StockCategory>>('stock/categories', params);
  }

  getCategoryTree(): Observable<StockCategory[]> {
    return this.api.get<StockCategory[]>('stock/categories/tree');
  }

  createCategory(payload: StockCategory): Observable<StockCategory> {
    return this.api.post<StockCategory>('stock/categories', payload);
  }

  updateCategory(id: string, payload: Partial<StockCategory>): Observable<StockCategory> {
    return this.api.patch<StockCategory>(`stock/categories/${id}`, payload);
  }

  deleteCategory(id: string): Observable<StockCategory> {
    return this.api.delete<StockCategory>(`stock/categories/${id}`);
  }

  getMaterials(params: any = {}): Observable<StockListResponse<StockMaterial>> {
    return this.api.get<StockListResponse<StockMaterial>>('stock/materials', params);
  }

  createMaterial(payload: StockMaterial): Observable<StockMaterial> {
    return this.api.post<StockMaterial>('stock/materials', payload);
  }

  updateMaterial(id: string, payload: Partial<StockMaterial>): Observable<StockMaterial> {
    return this.api.patch<StockMaterial>(`stock/materials/${id}`, payload);
  }

  deleteMaterial(id: string): Observable<StockMaterial> {
    return this.api.delete<StockMaterial>(`stock/materials/${id}`);
  }

  getLocations(params: any = {}): Observable<StockListResponse<StockLocation>> {
    return this.api.get<StockListResponse<StockLocation>>('stock/locations', params);
  }

  createLocation(payload: StockLocation): Observable<StockLocation> {
    return this.api.post<StockLocation>('stock/locations', payload);
  }

  updateLocation(id: string, payload: Partial<StockLocation>): Observable<StockLocation> {
    return this.api.patch<StockLocation>(`stock/locations/${id}`, payload);
  }

  deleteLocation(id: string): Observable<StockLocation> {
    return this.api.delete<StockLocation>(`stock/locations/${id}`);
  }

  getDocuments(kind: 'entries' | 'issues' | 'transfers', params: any = {}): Observable<StockListResponse<StockDocument>> {
    return this.api.get<StockListResponse<StockDocument>>(`stock/${kind}`, params);
  }

  getDocument(kind: 'entries' | 'issues' | 'transfers', id: string): Observable<any> {
    return this.api.get<any>(`stock/${kind}/${id}`);
  }

  createDocument(kind: 'entries' | 'issues' | 'transfers', payload: StockDocumentPayload): Observable<StockDocument> {
    return this.api.post<StockDocument>(`stock/${kind}`, payload);
  }

  submitDocument(kind: 'entries' | 'issues', id: string): Observable<StockDocument> {
    return this.api.post<StockDocument>(`stock/${kind}/${id}/submit`, {});
  }

  approveDocument(kind: 'entries' | 'issues', id: string): Observable<StockDocument> {
    return this.api.post<StockDocument>(`stock/${kind}/${id}/approve`, {});
  }

  postDocument(kind: 'entries' | 'issues' | 'transfers', id: string): Observable<StockDocument> {
    return this.api.post<StockDocument>(`stock/${kind}/${id}/post`, {});
  }

  cancelDocument(kind: 'entries' | 'issues' | 'transfers', id: string, motivo: string): Observable<StockDocument> {
    return this.api.post<StockDocument>(`stock/${kind}/${id}/cancel`, { motivo });
  }

  getRequests(params: any = {}): Observable<StockListResponse<StockRequest>> {
    return this.api.get<StockListResponse<StockRequest>>('stock/requests', params);
  }

  getRequest(id: string): Observable<any> {
    return this.api.get<any>(`stock/requests/${id}`);
  }

  createRequest(payload: StockRequestPayload): Observable<StockRequest> {
    return this.api.post<StockRequest>('stock/requests', payload);
  }

  submitRequest(id: string): Observable<StockRequest> {
    return this.api.post<StockRequest>(`stock/requests/${id}/submit`, {});
  }

  approveRequest(id: string, payload: ApproveStockRequestPayload): Observable<StockRequest> {
    return this.api.post<StockRequest>(`stock/requests/${id}/approve`, payload);
  }

  rejectRequest(id: string, motivo: string): Observable<StockRequest> {
    return this.api.post<StockRequest>(`stock/requests/${id}/reject`, { motivo });
  }

  fulfillRequest(id: string, payload: FulfillStockRequestPayload): Observable<any> {
    return this.api.post<any>(`stock/requests/${id}/fulfill`, payload);
  }

  cancelRequest(id: string): Observable<StockRequest> {
    return this.api.post<StockRequest>(`stock/requests/${id}/cancel`, {});
  }

  getReservations(params: any = {}): Observable<StockListResponse<any>> {
    return this.api.get<StockListResponse<any>>('stock/reservations', params);
  }

  getInventories(params: any = {}): Observable<StockListResponse<StockInventory>> {
    return this.api.get<StockListResponse<StockInventory>>('stock/inventories', params);
  }

  getInventory(id: string): Observable<StockInventory> {
    return this.api.get<StockInventory>(`stock/inventories/${id}`);
  }

  createInventory(payload: StockInventoryPayload): Observable<StockInventory> {
    return this.api.post<StockInventory>('stock/inventories', payload);
  }

  countInventory(id: string, payload: CountStockInventoryPayload): Observable<StockInventory> {
    return this.api.post<StockInventory>(`stock/inventories/${id}/count`, payload);
  }

  approveInventory(id: string): Observable<StockInventory> {
    return this.api.post<StockInventory>(`stock/inventories/${id}/approve`, {});
  }

  closeInventory(id: string): Observable<StockInventory> {
    return this.api.post<StockInventory>(`stock/inventories/${id}/close`, {});
  }

  getBudgets(params: any = {}): Observable<StockListResponse<StockBudget>> {
    return this.api.get<StockListResponse<StockBudget>>('stock/budgets', params);
  }

  getBudget(id: string): Observable<StockBudget> {
    return this.api.get<StockBudget>(`stock/budgets/${id}`);
  }

  createBudget(payload: StockBudgetPayload): Observable<StockBudget> {
    return this.api.post<StockBudget>('stock/budgets', payload);
  }

  approveBudget(id: string): Observable<StockBudget> {
    return this.api.post<StockBudget>(`stock/budgets/${id}/approve`, {});
  }

  getActualVsBudget(id: string): Observable<StockActualVsBudget> {
    return this.api.get<StockActualVsBudget>(`stock/budgets/${id}/actual-vs-budget`);
  }

  getReport(kind: StockReportKind, params: any = {}): Observable<StockReportResponse> {
    return this.api.get<StockReportResponse>(`stock/reports/${kind}`, params);
  }

}
