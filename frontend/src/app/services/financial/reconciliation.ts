
export interface BankStatement {
    id: string;
    data: string;
    descricao: string;
    valor: number;
    tipo: 'CREDIT' | 'DEBIT';
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
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
