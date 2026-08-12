
export interface OpenReceivable {
    id: string;
    descricao: string;
    valor: number;
    valorOriginal: number;
    valorRecebido: number;
    saldoReceber: number;
    dataVencimento: string;
    dataPagamento?: string | null;
    status: 'PREVISTO' | 'PARCIAL' | 'REALIZADO' | 'CONCILIADO' | 'CANCELADO';
    clienteId?: string | null;
    contratoId?: string | null;
    cliente?: {
        id: string;
        razaoSocial: string;
        nomeFantasia?: string | null;
    } | null;
    contrato?: {
        id: string;
        descricao?: string | null;
    } | null;
    categoria?: {
        id: string;
        nome: string;
    } | null;
}

export interface OpenPayable {
    id: string;
    descricao: string;
    valor: number;
    valorOriginal: number;
    valorRecebido: number;
    saldoReceber: number;
    dataVencimento: string;
    dataPagamento?: string | null;
    status: 'PREVISTO' | 'PARCIAL' | 'REALIZADO' | 'CONCILIADO' | 'CANCELADO';
    fornecedorId?: string | null;
    fornecedor?: {
        id: string;
        razaoSocial: string;
        nomeFantasia?: string | null;
    } | null;
    categoria?: {
        id: string;
        nome: string;
    } | null;
}


export interface BankStatement {
    id: string;
    data: string;
    descricao: string;
    descricaoPix?: string | null;
    endToEndId?: string | null;
    idTransacaoBanco?: string | null;
    valor: number;
    tipo: 'CREDIT' | 'DEBIT';
    sourceType?: string;
    hash: string;
    conciliado: boolean;
    importacaoId?: string;
    importacao?: {
        contaBancariaId: string;
    };
    suggestedEntity?: {
        cliente?: {
            id: string;
            nome: string;
            confidence: number;
        };
        fornecedor?: {
            id: string;
            nome: string;
            confidence: number;
        };
    };
    learnedSuggestion?: any;
    conciliacoes?: any[];
}

export interface SuggestedMatch {
    id: string;
    descricao: string;
    valor: number;
    dataVencimento: string;
    status: string;
    categoria?: { nome: string };
    centroCusto?: { nome: string };
    confidence?: number;
}

export interface PaginatedStatementsResponse {
    data: BankStatement[];
    summary?: {
        totalPendingValue: number;
        totalConciliatedValue: number;
        totalPeriodValue: number;
    };
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
