
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
