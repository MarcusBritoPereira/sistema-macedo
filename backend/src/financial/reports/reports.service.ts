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
    data?: any;
  }>;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async obterIdsHierarquia(centroCustoId: string): Promise<string[]> {
    const ccs = await this.prisma.centroCusto.findMany({
      select: { id: true, parentId: true }
    });

    const filhos: string[] = [centroCustoId];
    const processar = (id: string) => {
      const directChildren = ccs.filter(c => c.parentId === id);
      directChildren.forEach(child => {
        filhos.push(child.id);
        processar(child.id);
      });
    };

    processar(centroCustoId);
    return filhos;
  }


  private readonly reports: ReportDefinition[] = [
    {
      id: 'budget',
      title: 'Orçado x Realizado (Gestão de Obras)',
      description: 'Acompanhamento detalhado de desvios e variações de despesas das obras contra o orçamento previsto.',
      cadence: 'Mensal',
      category: 'Gestão de Obras',
      tags: ['Obras', 'Controle'],
      icon: 'bar-chart-outline',
      highlights: [
        'Desvios por etapa da obra',
        'Alertas de estouro',
        'Variações de custo',
      ],
      defaultSelected: true,
    },
    {
      id: 'cost-centers',
      title: 'Desempenho por Centro de Custo (Obras)',
      description: 'Consolidação gerencial de custos e investimentos integrados por obra e WBS.',
      cadence: 'Mensal',
      category: 'Gestão de Obras',
      tags: ['Obras', 'Gerencial'],
      icon: 'analytics-outline',
      highlights: [
        'Ranking de custos por obra',
        'Consolidação de subgrupos WBS',
        'Top despesas por insumo',
      ],
      defaultSelected: true,
    },
    {
      id: 'obras-abc',
      title: 'Curva ABC e Custos por Obra',
      description: 'Análise de curva ABC de insumos e custos detalhados (mão de obra, materiais) por Obra.',
      cadence: 'Mensal',
      category: 'Gestão de Obras',
      tags: ['Obras', 'ABC', 'Custos'],
      icon: 'pie-chart-outline',
      highlights: [
        'Curva ABC de Insumos',
        'Custo de Mão de Obra',
        'Custo de Material',
      ],
      defaultSelected: true,
    },
  ];

  getCatalog(): ReportDefinition[] {
    return this.reports;
  }

  async generate(
    payload: ReportGenerationRequestDto,
  ): Promise<ReportGenerationResponse> {
    const selected = this.reports.filter((report) =>
      payload.reportIds?.includes(report.id),
    );
    const now = new Date().toISOString();

    return {
      generatedAt: now,
      count: selected.length,
      message: selected.length
        ? `${selected.length} relatório(s) pronto(s) para visualização.`
        : 'Nenhum relatório selecionado.',
      reports: await Promise.all(
        selected.map(async (report) => {
          let data: any = null;
          if (report.id === 'dre') {
            data = await this.generateDREReport(payload.filters);
          } else if (report.id === 'cashflow') {
            data = await this.generateCashFlowReport(payload.filters);
          } else if (report.id === 'balance') {
            data = await this.generateBalanceReport(payload.filters);
          } else if (report.id === 'aging') {
            data = await this.generateAgingReport(payload.filters);
          } else if (report.id === 'bank-position') {
            data = await this.generateBankPositionReport(payload.filters);
          } else if (report.id === 'budget') {
            data = await this.generateBudgetReport(payload.filters);
          } else if (report.id === 'cost-centers') {
            data = await this.generateCostCentersReport(payload.filters);
          } else if (report.id === 'taxes') {
            data = await this.generateTaxesReport(payload.filters);
          } else if (report.id === 'obras-abc') {
            data = await this.generateObrasAbcReport(payload.filters);
          }
          return {
            id: report.id,
            title: report.title,
            status: 'ready',
            data: data,
          };
        }),
      ),
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
      dataVencimento: {
        // Or dataCompetencia if available/preferred
        gte: startDate,
        lte: endDate,
      },
      status: { in: ['REALIZADO', 'CONCILIADO'] }, // Only realized and reconciled
    };

    if (filters.accountId && filters.accountId !== 'all') {
      where.contaBancariaId = filters.accountId;
    }
    if (filters.costCenterId && filters.costCenterId !== 'all') {
      const costCenterIds = await this.obterIdsHierarquia(filters.costCenterId);
      where.centroCustoId = { in: costCenterIds };
    }

    // 3. Fetch Transactions with Category info
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where,
      include: {
        categoria: true,
      },
    });

    // 4. Aggregate by Classification
    const totals: Record<string, number> = {};

    // Initialize standard keys
    const keys = [
      'RECEITA_RECORRENTE',
      'RECEITA_NAO_RECORRENTE',
      'DEDUCOES_RECEITA',
      'CUSTO_SERVICOS_PRESTADOS',
      'DESPESA_ADMINISTRATIVA',
      'DESPESA_COMERCIAL',
      'DESPESA_ESTRUTURAL',
      'DESPESA_SOCIOS',
      'DESPESA_FINANCEIRA',
      'RECEITA_FINANCEIRA',
      'IMPOSTOS_LUCRO',
      'OUTROS',
    ];
    keys.forEach((k) => (totals[k] = 0));

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

    const receitaBruta =
      (totals['RECEITA_RECORRENTE'] || 0) +
      (totals['RECEITA_NAO_RECORRENTE'] || 0);
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

    const resFin =
      (totals['RECEITA_FINANCEIRA'] || 0) + (totals['DESPESA_FINANCEIRA'] || 0);
    const impostos = totals['IMPOSTOS_LUCRO'] || 0;
    const outros = totals['OUTROS'] || 0;

    const lucroLiquido = ebitda + resFin + impostos + outros;

    return {
      summary: {
        receitaBruta,
        receitaLiquida,
        lucroBruto,
        ebitda,
        lucroLiquido,
      },
      details: [
        {
          label: 'Receita Bruta',
          value: receitaBruta,
          level: 1,
          type: 'total',
        },
        {
          label: 'Receita Recorrente',
          value: totals['RECEITA_RECORRENTE'],
          level: 2,
        },
        {
          label: 'Receita Não Recorrente',
          value: totals['RECEITA_NAO_RECORRENTE'],
          level: 2,
        },
        { label: '(-) Deduções', value: deducoes, level: 1 },
        {
          label: '= Receita Líquida',
          value: receitaLiquida,
          level: 0,
          type: 'total',
        },
        { label: '(-) Custos dos Serviços', value: custos, level: 1 },
        { label: '= Lucro Bruto', value: lucroBruto, level: 0, type: 'total' },
        { label: '(-) Despesas Operacionais', value: despesasOp, level: 1 },
        { label: 'Administrativas', value: despAdm, level: 2 },
        { label: 'Comerciais', value: despCom, level: 2 },
        { label: 'Estruturais', value: despEst, level: 2 },
        { label: 'Sócios', value: despSoc, level: 2 },
        {
          label: '= Resultado Operacional (EBITDA)',
          value: ebitda,
          level: 0,
          type: 'total',
        },
        { label: 'Resultado Financeiro', value: resFin, level: 1 },
        { label: 'Impostos s/ Lucro', value: impostos, level: 1 },
        { label: 'Outros', value: outros, level: 1 },
        {
          label: '= Lucro Líquido do Exercício',
          value: lucroLiquido,
          level: 0,
          type: 'total',
          highlight: true,
        },
      ],
    };
  }

  private async generateCashFlowReport(filters: any) {
    let startDate: Date;
    let endDate: Date;

    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const where: any = {
      dataVencimento: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ['REALIZADO', 'CONCILIADO'] },
    };

    if (filters.accountId && filters.accountId !== 'all') {
      where.contaBancariaId = filters.accountId;
    }
    if (filters.costCenterId && filters.costCenterId !== 'all') {
      const costCenterIds = await this.obterIdsHierarquia(filters.costCenterId);
      where.centroCustoId = { in: costCenterIds };
    }

    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where,
    });

    let totalEntradas = 0;
    let totalSaidas = 0;

    for (const t of transactions) {
      const val = Number(t.valor);
      if (t.tipo === 'DESPESA' || val < 0) {
        totalSaidas += Math.abs(val);
      } else {
        totalEntradas += val;
      }
    }

    const saldoPeriodo = totalEntradas - totalSaidas;

    return {
      summary: null,
      details: [
        {
          label: 'Entradas (Receitas)',
          value: totalEntradas,
          level: 0,
          type: 'total',
          highlight: true,
        },
        {
          label: 'Saídas (Despesas)',
          value: -totalSaidas,
          level: 0,
          type: 'total',
          highlight: true,
        },
        {
          label: 'Saldo do Período',
          value: saldoPeriodo,
          level: 0,
          type: 'total',
          highlight: true,
        },
      ],
    };
  }

  private async generateBalanceReport(filters: any) {
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: { status: { in: ['REALIZADO', 'CONCILIADO'] } }, // simplified balance up to today
    });

    let ativo = 0;
    let passivo = 0;

    for (const t of transactions) {
      const val = Math.abs(Number(t.valor));
      if (t.tipo === 'RECEITA') ativo += val;
      if (t.tipo === 'DESPESA') passivo += val;
    }

    return {
      summary: null,
      details: [
        {
          label: 'Ativo (Entradas Acumuladas)',
          value: ativo,
          level: 0,
          type: 'total',
        },
        {
          label: 'Passivo (Saídas Acumuladas)',
          value: passivo,
          level: 0,
          type: 'total',
        },
        {
          label: 'Patrimônio Líquido Estimado',
          value: ativo - passivo,
          level: 0,
          type: 'total',
          highlight: true,
        },
      ],
    };
  }

  private async generateAgingReport(filters: any) {
    const now = new Date();
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: { status: 'PREVISTO' },
      include: { categoria: true },
    });

    let vencidosPag = 0;
    let aVencerPag = 0;
    let vencidosRec = 0;
    let aVencerRec = 0;

    for (const t of transactions) {
      if (!t.dataVencimento) continue;
      const isOverdue = new Date(t.dataVencimento) < now;
      const val = Math.abs(Number(t.valor));

      if (t.tipo === 'DESPESA') {
        if (isOverdue) vencidosPag += val;
        else aVencerPag += val;
      } else {
        if (isOverdue) vencidosRec += val;
        else aVencerRec += val;
      }
    }

    return {
      summary: null,
      details: [
        {
          label: 'Contas a Receber',
          value: vencidosRec + aVencerRec,
          level: 0,
          type: 'header',
        },
        { label: 'Vencidos', value: vencidosRec, level: 1 },
        { label: 'A Vencer', value: aVencerRec, level: 1 },
        {
          label: 'Contas a Pagar',
          value: vencidosPag + aVencerPag,
          level: 0,
          type: 'header',
        },
        { label: 'Vencidos', value: vencidosPag, level: 1 },
        { label: 'A Vencer', value: aVencerPag, level: 1 },
        {
          label: 'Exposição Líquida Curto Prazo',
          value: vencidosRec + aVencerRec - (vencidosPag + aVencerPag),
          level: 0,
          type: 'total',
          highlight: true,
        },
      ],
    };
  }

  private async generateBankPositionReport(filters: any) {
    const accounts = await this.prisma.contaBancaria.findMany();
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        contaBancariaId: { not: null },
      },
    });

    let total = 0;
    const details: any[] = [];

    details.push({
      label: 'Saldos em Conta',
      value: 0,
      level: 0,
      type: 'header',
    });

    for (const acc of accounts) {
      let b = Number(acc.saldoInicial || 0);
      const accTrans = transactions.filter((t) => t.contaBancariaId === acc.id);
      for (const t of accTrans) {
        if (t.tipo === 'RECEITA') b += Math.abs(Number(t.valor));
        if (t.tipo === 'DESPESA') b -= Math.abs(Number(t.valor));
      }
      total += b;
      details.push({ label: acc.nome, value: b, level: 1 });
    }

    details.push({
      label: 'Total Disponível',
      value: total,
      level: 0,
      type: 'total',
      highlight: true,
    });

    return { summary: null, details };
  }

  private async generateBudgetReport(filters: any) {
    let startDate: Date;
    let endDate: Date;
    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const n = new Date();
      startDate = new Date(n.getFullYear(), n.getMonth(), 1);
      endDate = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    }

    // 1. Get all Cost Centers that have a defined budget
    const budgetedCenters = await this.prisma.centroCusto.findMany({
      where: {
        orcamentoPrevisto: { not: null },
        ativo: true
      },
      orderBy: { codigo: 'asc' }
    });

    const details: any[] = [];
    details.push({
      label: 'Acompanhamento Físico-Financeiro das Obras',
      value: 0,
      level: 0,
      type: 'header',
    });

    let totalBudget = 0;
    let totalReal = 0;

    for (const c of budgetedCenters) {
      const budget = Number(c.orcamentoPrevisto || 0);
      
      // Get all recursive child IDs for rollup
      const ccIds = await this.obterIdsHierarquia(c.id);
      
      // Query transactions under these cost centers
      const transactions = await this.prisma.lancamentoFinanceiro.findMany({
        where: {
          dataVencimento: { gte: startDate, lte: endDate },
          status: { in: ['REALIZADO', 'CONCILIADO'] },
          tipo: 'DESPESA',
          centroCustoId: { in: ccIds }
        },
        select: { valor: true }
      });

      const realValue = transactions.reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0);
      
      totalBudget += budget;
      totalReal += realValue;

      details.push({
        label: `${c.codigo || 'S/C'} - ${c.nome} (Orçamento Previsto)`,
        value: budget,
        level: 1,
      });

      details.push({
        label: `${c.codigo || 'S/C'} - ${c.nome} (Realizado Acumulado)`,
        value: realValue,
        level: 1,
      });

      const variance = realValue - budget;
      if (variance > 0) {
        details.push({
          label: `${c.codigo || 'S/C'} - ${c.nome} (⚠️ Estouro de Orçamento)`,
          value: variance,
          level: 2,
          highlight: true,
        });
      } else {
        details.push({
          label: `${c.codigo || 'S/C'} - ${c.nome} (✅ Saldo Restante/Sobra)`,
          value: Math.abs(variance),
          level: 2,
        });
      }
    }

    details.push({
      label: 'Total Geral Orçado (Obras)',
      value: totalBudget,
      level: 0,
      type: 'total',
      highlight: true,
    });

    details.push({
      label: 'Total Geral Realizado (Obras)',
      value: totalReal,
      level: 0,
      type: 'total',
      highlight: true,
    });

    const totalVariance = totalReal - totalBudget;
    details.push({
      label: totalVariance > 0 ? 'Diferença Consolidada (Estouro Total)' : 'Diferença Consolidada (Economia Total)',
      value: Math.abs(totalVariance),
      level: 0,
      type: 'total',
      highlight: true,
    });

    return { summary: null, details };
  }

  private async generateCostCentersReport(filters: any) {
    let startDate: Date;
    let endDate: Date;
    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const n = new Date();
      startDate = new Date(n.getFullYear(), n.getMonth(), 1);
      endDate = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    }

    const centers = await this.prisma.centroCusto.findMany();
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        dataVencimento: { gte: startDate, lte: endDate },
        status: { in: ['REALIZADO', 'CONCILIADO'] },
      },
    });

    const aggr: Record<string, number> = {};
    for (const c of centers) aggr[c.id] = 0;
    let semCentro = 0;

    for (const t of transactions) {
      if (t.tipo !== 'DESPESA') continue; // only analyze costs
      const val = Math.abs(Number(t.valor));
      if (t.centroCustoId && aggr[t.centroCustoId] !== undefined) {
        aggr[t.centroCustoId] += val;
      } else {
        semCentro += val;
      }
    }

    const details: any[] = [];
    details.push({
      label: 'Despesas por Centro de Custo',
      value: 0,
      level: 0,
      type: 'header',
    });

    let total = 0;
    for (const c of centers) {
      if (aggr[c.id] > 0) {
        details.push({ label: c.nome, value: aggr[c.id], level: 1 });
        total += aggr[c.id];
      }
    }
    if (semCentro > 0) {
      details.push({
        label: 'Sem Centro Específico',
        value: semCentro,
        level: 1,
      });
      total += semCentro;
    }

    details.push({
      label: 'Total Alocado',
      value: total,
      level: 0,
      type: 'total',
      highlight: true,
    });

    return { summary: null, details };
  }

  private async generateTaxesReport(filters: any) {
    // Just finding expenses matching IMPOSTOS
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: { status: { in: ['REALIZADO', 'CONCILIADO'] } },
      include: { categoria: true },
    });

    let federal = 0;
    let estadual = 0;
    let municipal = 0;
    let outros = 0;

    for (const t of transactions) {
      if (t.tipo !== 'DESPESA') continue;
      if (t.categoria?.classificacao === 'IMPOSTOS_LUCRO') {
        const n = (t.categoria.nome || '').toLowerCase();
        const val = Math.abs(Number(t.valor));
        if (n.includes('icms')) estadual += val;
        else if (n.includes('iss')) municipal += val;
        else if (
          n.includes('irpj') ||
          n.includes('csll') ||
          n.includes('pis') ||
          n.includes('cofins')
        )
          federal += val;
        else outros += val;
      }
    }

    const total = federal + estadual + municipal + outros;

    return {
      summary: null,
      details: [
        { label: 'Carga Tributária', value: total, level: 0, type: 'header' },
        {
          label: 'Federais (IRPJ, CSLL, PIS, COFINS)',
          value: federal,
          level: 1,
        },
        { label: 'Estaduais (ICMS)', value: estadual, level: 1 },
        { label: 'Municipais (ISS)', value: municipal, level: 1 },
        { label: 'Outros Encargos', value: outros, level: 1 },
        {
          label: 'Total de Impostos Pagos',
          value: total,
          level: 0,
          type: 'total',
          highlight: true,
        },
      ],
    };
  }

  private async generateObrasAbcReport(filters: any) {
    let startDate: Date;
    let endDate: Date;
    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const n = new Date();
      startDate = new Date(n.getFullYear(), n.getMonth(), 1);
      endDate = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    }

    const obras = await this.prisma.obra.findMany();
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        dataVencimento: { gte: startDate, lte: endDate },
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        tipo: 'DESPESA',
      },
    });

    const details: any[] = [];
    details.push({
      label: 'Custos por Obra (Mão de Obra vs Material)',
      value: 0,
      level: 0,
      type: 'header',
    });

    let totalGeral = 0;

    for (const obra of obras) {
      const transObra = transactions.filter(t => t.obraId === obra.id);
      if (transObra.length === 0) continue;

      let maoDeObra = 0;
      let material = 0;
      let outros = 0;

      for (const t of transObra) {
        const val = Math.abs(Number(t.valor));
        if (t.tipoCusto === 'MAO_DE_OBRA') maoDeObra += val;
        else if (t.tipoCusto === 'MATERIAL') material += val;
        else outros += val;
      }

      const totalObra = maoDeObra + material + outros;
      totalGeral += totalObra;

      details.push({ label: `Obra: ${obra.nome}`, value: totalObra, level: 1 });
      if (maoDeObra > 0) details.push({ label: 'Mão de Obra', value: maoDeObra, level: 2 });
      if (material > 0) details.push({ label: 'Material', value: material, level: 2 });
      if (outros > 0) details.push({ label: 'Outros Custos', value: outros, level: 2 });
    }

    // Curva ABC
    const insumosAgregados: Record<string, number> = {};
    for (const t of transactions) {
      if (t.tipoCusto === 'MATERIAL' && t.categoriaCusto) {
        insumosAgregados[t.categoriaCusto] = (insumosAgregados[t.categoriaCusto] || 0) + Math.abs(Number(t.valor));
      }
    }

    const insumosSorted = Object.entries(insumosAgregados).sort((a, b) => b[1] - a[1]);
    
    details.push({
      label: 'Curva ABC - Materiais Mais Representativos',
      value: 0,
      level: 0,
      type: 'header',
    });

    for (const [nome, valor] of insumosSorted.slice(0, 10)) {
      details.push({ label: nome, value: valor, level: 1 });
    }

    details.push({
      label: 'Total de Custos no Período',
      value: totalGeral,
      level: 0,
      type: 'total',
      highlight: true,
    });

    return { summary: null, details };
  }
}
