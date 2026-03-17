export interface DREPeriodo {
  [key: string]: number;
}

export interface DRESubcategoria {
  total: number;
  periodos: DREPeriodo;
}

export interface DRECategoria {
  total: number;
  periodos: DREPeriodo;
  subcategorias: {
    [key: string]: DRESubcategoria;
  };
}

export interface DREResult {
  periodos: string[];
  data: {
    [key: string]: DRECategoria;
  };
  totais: {
    [key: string]: {
      total: number;
      periodos: DREPeriodo;
    };
  };
  margens: {
    [key: string]: {
      total: number;
      periodos: DREPeriodo;
    };
  };
  recorrente: {
    total: number;
    periodos: DREPeriodo;
  };
}

export interface DREParams {
  regime: 'caixa' | 'competencia';
  dataInicio: string;
  dataFim: string;
  granularidade: 'mensal' | 'trimestral' | 'anual';
  incluirRateios?: boolean;
}
