import { Injectable } from '@nestjs/common';

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  cadence: string;
  category: string;
  tags: string[];
  icon: string;
  highlights: string[];
  defaultSelected?: boolean;
}

export interface ReportGenerationRequest {
  reportIds: string[];
  filters: {
    period: string;
    startDate?: string | null;
    endDate?: string | null;
    accountId?: string | null;
    costCenterId?: string | null;
    includeProvisional?: boolean;
  };
}

export interface ReportGenerationResponse {
  generatedAt: string;
  count: number;
  message: string;
  reports: Array<{ id: string; title: string; status: string }>;
}

@Injectable()
export class ReportsService {
  private readonly reports: ReportDefinition[] = [
    {
      id: 'dre',
      title: 'DRE (Resultado do Exercício)',
      description: 'Evolução do resultado, margens e comparação com o planejado.',
      cadence: 'Mensal',
      category: 'Performance',
      tags: ['Essencial', 'Contábil'],
      icon: 'pie-chart-outline',
      highlights: ['Margem bruta e líquida', 'Receita vs. despesas', 'Comparativo por período'],
      defaultSelected: true
    },
    {
      id: 'cashflow',
      title: 'Fluxo de Caixa',
      description: 'Entradas e saídas projetadas para antecipar necessidades de caixa.',
      cadence: 'Diário / Semanal',
      category: 'Liquidez',
      tags: ['Essencial', 'Operacional'],
      icon: 'cash-outline',
      highlights: ['Saldo inicial e final', 'Projeções futuras', 'Alertas de caixa'],
      defaultSelected: true
    },
    {
      id: 'balance',
      title: 'Balanço Patrimonial',
      description: 'Visão consolidada de ativos, passivos e patrimônio líquido.',
      cadence: 'Mensal',
      category: 'Estrutura',
      tags: ['Essencial', 'Contábil'],
      icon: 'layers-outline',
      highlights: ['Capital de giro', 'Endividamento', 'Saúde financeira']
    },
    {
      id: 'aging',
      title: 'Aging de Contas (Pagar/Receber)',
      description: 'Distribuição por vencimento para priorização de cobrança e pagamentos.',
      cadence: 'Semanal',
      category: 'Risco',
      tags: ['Essencial', 'Cobrança'],
      icon: 'calendar-outline',
      highlights: ['Vencidos', 'A vencer', 'Prioridades de cobrança'],
      defaultSelected: true
    },
    {
      id: 'bank-position',
      title: 'Posição Bancária',
      description: 'Saldos por banco e atualização de conciliações.',
      cadence: 'Diário',
      category: 'Liquidez',
      tags: ['Operacional'],
      icon: 'wallet-outline',
      highlights: ['Saldo disponível', 'Última conciliação', 'Distribuição por conta']
    },
    {
      id: 'budget',
      title: 'Orçado x Realizado',
      description: 'Acompanhamento de desvios e variações orçamentárias.',
      cadence: 'Mensal',
      category: 'Controle',
      tags: ['Gestão'],
      icon: 'bar-chart-outline',
      highlights: ['Desvios por categoria', 'Alertas de estouro', 'Tendência anual']
    },
    {
      id: 'cost-centers',
      title: 'Desempenho por Centro de Custo',
      description: 'Consolidação de resultados por área ou unidade de negócio.',
      cadence: 'Mensal',
      category: 'Gestão',
      tags: ['Gerencial'],
      icon: 'analytics-outline',
      highlights: ['Ranking por contribuição', 'Comparativo entre áreas', 'Top despesas']
    },
    {
      id: 'taxes',
      title: 'Resumo de Impostos',
      description: 'Obrigações fiscais, provisões e pagamentos por competência.',
      cadence: 'Mensal',
      category: 'Compliance',
      tags: ['Fiscal'],
      icon: 'document-text-outline',
      highlights: ['Impostos a pagar', 'Histórico de recolhimento', 'Alertas de vencimento']
    }
  ];

  getCatalog(): ReportDefinition[] {
    return this.reports;
  }

  generate(payload: ReportGenerationRequest): ReportGenerationResponse {
    const selected = this.reports.filter(report => payload.reportIds?.includes(report.id));
    const now = new Date().toISOString();

    return {
      generatedAt: now,
      count: selected.length,
      message: selected.length
        ? `${selected.length} relatório(s) pronto(s) para download.`
        : 'Nenhum relatório selecionado.',
      reports: selected.map(report => ({
        id: report.id,
        title: report.title,
        status: 'ready'
      }))
    };
  }
}
