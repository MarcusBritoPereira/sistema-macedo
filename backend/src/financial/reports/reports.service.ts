import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto';

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

export interface ReportGenerationResponse {
  generatedAt: string;
  count: number;
  message: string;
  reports: Array<{
    id: string;
    title: string;
    status: string;
    data?: any
  }>;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

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


  async generate(payload: ReportGenerationRequestDto): Promise<ReportGenerationResponse> {
    const selected = this.reports.filter(report => payload.reportIds?.includes(report.id));
    const now = new Date().toISOString();

    return {
      generatedAt: now,
      count: selected.length,
      message: selected.length
        ? `${selected.length} relatório(s) pronto(s) para visualização.`
        : 'Nenhum relatório selecionado.',
      reports: await Promise.all(selected.map(async report => {
        let data: any = null;
        if (report.id === 'dre') {
          data = await this.generateDREReport(payload.filters);
        }
        return {
          id: report.id,
          title: report.title,
          status: 'ready',
          data: data
        };
      }))
    };
  }

  private async generateDREReport(filters: any) {
    // 1. Determine Date Range
    let startDate: Date;
    let endDate: Date;

    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      // Adjust time to full day coverage
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to current month if not provided (though frontend should provide)
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // 2. Build Query
    const where: any = {
      dataVencimento: { // Or dataCompetencia if available/preferred
        gte: startDate,
        lte: endDate
      },
      status: { in: ['REALIZADO', 'PAGO', 'CONCILIADO'] } // Only realized
    };

    if (filters.accountId && filters.accountId !== 'all') {
      where.contaBancariaId = filters.accountId;
    }
    if (filters.costCenterId && filters.costCenterId !== 'all') {
      where.centroCustoId = filters.costCenterId;
    }

    // 3. Fetch Transactions with Category info
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where,
      include: {
        categoria: true
      }
    });

    // 4. Aggregate by Classification
    const totals: Record<string, number> = {};

    // Initialize standard keys
    const keys = [
      'RECEITA_RECORRENTE', 'RECEITA_NAO_RECORRENTE', 'DEDUCOES_RECEITA',
      'CUSTO_SERVICOS_PRESTADOS', 'DESPESA_ADMINISTRATIVA', 'DESPESA_COMERCIAL',
      'DESPESA_ESTRUTURAL', 'DESPESA_SOCIOS', 'DESPESA_FINANCEIRA',
      'RECEITA_FINANCEIRA', 'IMPOSTOS_LUCRO', 'OUTROS'
    ];
    keys.forEach(k => totals[k] = 0);

    for (const t of transactions) {
      const cls = t.categoria?.classificacao || 'OUTROS';

      // Ensure values are numbers. RECEITA is positive, DESPESA is negative usually.
      // However, in DRE standard, we usually sum absolutes and subtract in the structure.
      // Let's assume stored values are: Revenue (+) Expense (-).
      // Check TipoLancamento just in case.
      let val = Number(t.valor);
      if (t.tipo === 'DESPESA') val = -Math.abs(val);
      else val = Math.abs(val);

      if (totals[cls] === undefined) totals[cls] = 0;
      totals[cls] += val;
    }

    // 5. Structure DRE
    // Structure:
    // (=) Receita Bruta (Recorrente + Nao Recorrente)
    // (-) Deduções
    // (=) Receita Líquida
    // (-) Custos
    // (=) Lucro Bruto
    // (-) Despesas (Adm + Com + Est + Soc)
    // (=) EBITDA
    // (+/-) Resultado Financeiro
    // (-) Outros / Impostos
    // (=) Lucro Líquido

    const receitaBruta = (totals['RECEITA_RECORRENTE'] || 0) + (totals['RECEITA_NAO_RECORRENTE'] || 0);
    const deducoes = totals['DEDUCOES_RECEITA'] || 0; // Negative
    const receitaLiquida = receitaBruta + deducoes;

    const custos = totals['CUSTO_SERVICOS_PRESTADOS'] || 0; // Negative
    const lucroBruto = receitaLiquida + custos;

    const despAdm = totals['DESPESA_ADMINISTRATIVA'] || 0;
    const despCom = totals['DESPESA_COMERCIAL'] || 0;
    const despEst = totals['DESPESA_ESTRUTURAL'] || 0;
    const despSoc = totals['DESPESA_SOCIOS'] || 0;
    const despesasOp = despAdm + despCom + despEst + despSoc;

    const ebitda = lucroBruto + despesasOp;

    const resFin = (totals['RECEITA_FINANCEIRA'] || 0) + (totals['DESPESA_FINANCEIRA'] || 0);
    const impostos = totals['IMPOSTOS_LUCRO'] || 0;
    const outros = totals['OUTROS'] || 0;

    const lucroLiquido = ebitda + resFin + impostos + outros;

    return {
      summary: {
        receitaBruta,
        receitaLiquida,
        lucroBruto,
        ebitda,
        lucroLiquido
      },
      details: [
        { label: 'Receita Bruta', value: receitaBruta, level: 1, type: 'total' },
        { label: 'Receita Recorrente', value: totals['RECEITA_RECORRENTE'], level: 2 },
        { label: 'Receita Não Recorrente', value: totals['RECEITA_NAO_RECORRENTE'], level: 2 },
        { label: '(-) Deduções', value: deducoes, level: 1 },
        { label: '= Receita Líquida', value: receitaLiquida, level: 0, type: 'total' },
        { label: '(-) Custos dos Serviços', value: custos, level: 1 },
        { label: '= Lucro Bruto', value: lucroBruto, level: 0, type: 'total' },
        { label: '(-) Despesas Operacionais', value: despesasOp, level: 1 },
        { label: 'Administrativas', value: despAdm, level: 2 },
        { label: 'Comerciais', value: despCom, level: 2 },
        { label: 'Estruturais', value: despEst, level: 2 },
        { label: 'Sócios', value: despSoc, level: 2 },
        { label: '= Resultado Operacional (EBITDA)', value: ebitda, level: 0, type: 'total' },
        { label: 'Resultado Financeiro', value: resFin, level: 1 },
        { label: 'Impostos s/ Lucro', value: impostos, level: 1 },
        { label: 'Outros', value: outros, level: 1 },
        { label: '= Lucro Líquido do Exercício', value: lucroLiquido, level: 0, type: 'total', highlight: true }
      ]
    };
  }
}
