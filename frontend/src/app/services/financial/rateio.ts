export interface RateioLancamento {
  id?: string;
  valor: number;
  recorrente: boolean;
  observacao?: string;
  categoria: string;
  subcategoria?: string;
  lancamentoId?: string;
  categoriaFinanceiraId?: string;
  categoriaFinanceira?: any;
  tipoDestino?: 'OBRA' | 'CENTRO_CUSTO';
  obraId?: string;
  obra?: any;
  centroCustoId?: string;
  centroCusto?: any;
  tipoCusto?: 'MATERIAL' | 'MAO_DE_OBRA' | 'SERVICO' | 'EQUIPAMENTO' | 'OUTROS';
  categoriaCusto?: string;
  descricaoItem?: string;
  quantidade?: number;
  valorUnitario?: number;
}

export interface RateioBatch {
  rateios: RateioLancamento[];
}
