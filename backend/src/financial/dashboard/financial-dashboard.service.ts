import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassificacaoDRE } from '@prisma/client';
import { BankingIntegrationService } from '../banking-integration/banking-integration.service';
import * as fs from 'fs';

@Injectable()
export class FinancialDashboardService {
  constructor(
    private prisma: PrismaService,
    private bankingService: BankingIntegrationService,
  ) {}

  async getDRE(startDate: Date, endDate: Date) {
    // 1. Fetch Records (Unified)
    const transactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        dataVencimento: {
          gte: startDate,
          lte: endDate,
        },
        categoria: {
          isNot: null,
        },
      },
      include: {
        categoria: true,
      },
    });

    const receivables = transactions.filter((t) => t.tipo === 'RECEITA');
    const payables = transactions.filter((t) => t.tipo === 'DESPESA');

    // 3. Aggregate
    const totals = {
      [ClassificacaoDRE.RECEITA_RECORRENTE]: 0,
      [ClassificacaoDRE.RECEITA_NAO_RECORRENTE]: 0,
      [ClassificacaoDRE.DEDUCOES_RECEITA]: 0,
      [ClassificacaoDRE.CUSTO_SERVICOS_PRESTADOS]: 0,
      [ClassificacaoDRE.DESPESA_ADMINISTRATIVA]: 0,
      [ClassificacaoDRE.DESPESA_COMERCIAL]: 0,
      [ClassificacaoDRE.DESPESA_ESTRUTURAL]: 0,
      [ClassificacaoDRE.DESPESA_SOCIOS]: 0,
      [ClassificacaoDRE.DESPESA_FINANCEIRA]: 0,
      [ClassificacaoDRE.RECEITA_FINANCEIRA]: 0,
      [ClassificacaoDRE.IMPOSTOS_LUCRO]: 0,
      [ClassificacaoDRE.OUTROS]: 0,
    };

    // Helper to sum
    receivables.forEach((r) => {
      const clf = r.categoria?.classificacao;
      if (clf && totals[clf] !== undefined) {
        totals[clf] += Number(r.valor);
      }
    });

    payables.forEach((p) => {
      const clf = p.categoria?.classificacao;
      if (clf && totals[clf] !== undefined) {
        totals[clf] += Number(p.valor);
      }
    });

    // 4. Calculate DRE Lines
    const receitasOperacionais =
      totals.RECEITA_RECORRENTE + totals.RECEITA_NAO_RECORRENTE;
    const receitaBruta = receitasOperacionais;
    const deducoes = totals.DEDUCOES_RECEITA;
    const receitaLiquida = receitaBruta - deducoes;

    const csp = totals.CUSTO_SERVICOS_PRESTADOS;
    const lucroBruto = receitaLiquida - csp;

    const despesasOperacionais =
      totals.DESPESA_ADMINISTRATIVA +
      totals.DESPESA_COMERCIAL +
      totals.DESPESA_ESTRUTURAL +
      totals.DESPESA_SOCIOS;

    const ebit = lucroBruto - despesasOperacionais; // EBIT = Operating Result

    const resultadoFinanceiro =
      totals.RECEITA_FINANCEIRA - totals.DESPESA_FINANCEIRA;

    const lair = ebit + resultadoFinanceiro; // LAIR

    const impostosLucro = totals.IMPOSTOS_LUCRO;

    const lucroLiquido = lair - impostosLucro;

    const outrasReceitasDespesasNaoOperacionais = totals.OUTROS;
    const lucroLiquidoAposNaoOperacional =
      lucroLiquido + outrasReceitasDespesasNaoOperacionais;

    const despesasInvestimentosEmprestimos = Math.max(
      0,
      -outrasReceitasDespesasNaoOperacionais,
    );
    const lucroPrejuizoFinal =
      lucroLiquidoAposNaoOperacional - despesasInvestimentosEmprestimos;

    const estruturaGerencial = [
      {
        chave: 'receitasOperacionais',
        titulo: 'Receitas Operacionais',
        descricao:
          'Vendas diretamente ligadas à atividade econômica da empresa.',
        valor: receitasOperacionais,
      },
      {
        chave: 'deducoesReceitaBruta',
        titulo: '(-) Deduções da Receita Bruta',
        descricao:
          'Devoluções, descontos concedidos, comissões e impostos incidentes sobre as vendas.',
        valor: deducoes,
      },
      {
        chave: 'receitaLiquidaVendas',
        titulo: '(=) Receita Líquida de Vendas',
        descricao:
          'Receitas operacionais descontando deduções e impostos sobre vendas.',
        valor: receitaLiquida,
      },
      {
        chave: 'custosOperacionais',
        titulo: '(-) Custos Operacionais',
        descricao: 'Custos diretamente ligados à geração da receita.',
        valor: csp,
      },
      {
        chave: 'lucroBruto',
        titulo: '(=) Lucro Bruto',
        descricao: 'Resultado antes das despesas operacionais.',
        valor: lucroBruto,
      },
      {
        chave: 'despesasOperacionais',
        titulo: '(-) Despesas Operacionais',
        descricao:
          'Gastos administrativos, comerciais, estruturais e com sócios.',
        valor: despesasOperacionais,
      },
      {
        chave: 'lucroOperacional',
        titulo: '(=) Lucro/Prejuízo Operacional',
        descricao: 'Diferença entre receita líquida e gastos da operação.',
        valor: ebit,
      },
      {
        chave: 'resultadoFinanceiro',
        titulo: '(+) Resultado Financeiro',
        descricao: 'Receitas financeiras menos despesas financeiras.',
        valor: resultadoFinanceiro,
      },
      {
        chave: 'lucroLiquido',
        titulo: '(=) Lucro/Prejuízo Líquido',
        descricao: 'Resultado após impostos sobre o lucro.',
        valor: lucroLiquido,
      },
      {
        chave: 'naoOperacional',
        titulo: '(±) Outras Receitas e Despesas Não Operacionais',
        descricao:
          'Eventos não recorrentes e não ligados à operação principal.',
        valor: outrasReceitasDespesasNaoOperacionais,
      },
      {
        chave: 'investimentosEmprestimos',
        titulo: '(-) Despesas com Investimentos e Empréstimos',
        descricao:
          'Parcelas programadas de financiamentos, empréstimos e aquisições de ativos.',
        valor: despesasInvestimentosEmprestimos,
      },
      {
        chave: 'lucroFinal',
        titulo: '(=) Lucro/Prejuízo Final',
        descricao:
          'Resultado final do período após todos os custos e despesas.',
        valor: lucroPrejuizoFinal,
      },
    ];

    return {
      period: { start: startDate, end: endDate },
      breakdown: totals,
      estruturaGerencial,
      summary: {
        receitasOperacionais,
        receitaBruta,
        deducoes,
        receitaLiquida,
        csp,
        lucroBruto,
        despesasOperacionais,
        ebit,
        resultadoFinanceiro,
        lair,
        impostosLucro,
        lucroLiquido,
        outrasReceitasDespesasNaoOperacionais,
        despesasInvestimentosEmprestimos,
        lucroPrejuizoFinal,
      },
    };
  }

  async getExecutiveDashboard(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 1. KPIs
    // Total Revenue (Paid: REALIZADO or CONCILIADO)
    // We assume 'dataPagamento' is set when status is REALIZADO/CONCILIADO
    const totalReceita = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'RECEITA',
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        dataPagamento: { gte: startDate, lte: endDate },
      },
    });

    // Total Expenses (Paid)
    const totalDespesas = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'DESPESA',
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        dataPagamento: { gte: startDate, lte: endDate },
      },
    });

    // Accounts Receivable (Open/Overdue in period) -> Status PREVISTO
    const contasReceber = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'RECEITA',
        status: 'PREVISTO',
        dataVencimento: { gte: startDate, lte: endDate },
      },
    });

    // Accounts Payable (Open)
    const contasPagar = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'DESPESA',
        status: 'PREVISTO',
        dataVencimento: { gte: startDate, lte: endDate },
      },
    });

    // 2. Indicators
    const receitaVal = Number(totalReceita._sum.valor || 0);
    const despesaVal = Number(totalDespesas._sum.valor || 0);
    const lucroLiquido = receitaVal - despesaVal;

    const margemLucro = receitaVal > 0 ? (lucroLiquido / receitaVal) * 100 : 0;

    // Balance (Ending Balance) - Ideally this should come from ContaBancaria.saldoAtual + history
    // But for MVP we sum all history? That's heavy.
    // Let's sum all paid items until endDate.
    const allIn = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'RECEITA',
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        dataPagamento: { lte: endDate },
      },
    });
    const allOut = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'DESPESA',
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        dataPagamento: { lte: endDate },
      },
    });
    const saldoFinal =
      Number(allIn._sum.valor || 0) - Number(allOut._sum.valor || 0);

    // Liquidity
    const arVal = Number(contasReceber._sum.valor || 0);
    const apVal = Number(contasPagar._sum.valor || 0);
    const liquidezReduzida = apVal > 0 ? (saldoFinal + arVal) / apVal : 0;
    const liquidezGeral = apVal > 0 ? (saldoFinal + arVal) / apVal : 0;

    // 3. Budget
    const budget = await this.prisma.financialBudget.findUnique({
      where: { mes_ano: { mes: month, ano: year } },
    });

    // 4. Historical Data (Last 12 Months)
    const history: {
      label: string;
      receita: number;
      despesa: number;
      lucro: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const startM = new Date(y, m - 1, 1);
      const endM = new Date(y, m, 0);

      const rev = await this.prisma.lancamentoFinanceiro.aggregate({
        _sum: { valor: true },
        where: {
          tipo: 'RECEITA',
          status: { in: ['REALIZADO', 'CONCILIADO'] },
          dataPagamento: { gte: startM, lte: endM },
        },
      });
      const exp = await this.prisma.lancamentoFinanceiro.aggregate({
        _sum: { valor: true },
        where: {
          tipo: 'DESPESA',
          status: { in: ['REALIZADO', 'CONCILIADO'] },
          dataPagamento: { gte: startM, lte: endM },
        },
      });

      history.push({
        label: `${m}/${y}`,
        receita: Number(rev._sum.valor || 0),
        despesa: Number(exp._sum.valor || 0),
        lucro: Number(rev._sum.valor || 0) - Number(exp._sum.valor || 0),
      });
    }

    return {
      kpis: {
        totalReceita: receitaVal,
        totalDespesas: despesaVal,
        contasReceber: arVal,
        contasPagar: apVal,
        lucroLiquido,
        margemLucro,
        saldoFinal,
        liquidezReduzida,
        liquidezGeral,
      },
      budget: {
        receitaMeta: Number(budget?.receitaMeta || 0),
        despesaMeta: Number(budget?.despesaMeta || 0),
        receitaPct:
          Number(budget?.receitaMeta || 0) > 0
            ? (receitaVal / Number(budget?.receitaMeta || 1)) * 100
            : 0,
        despesaPct:
          Number(budget?.despesaMeta || 0) > 0
            ? (despesaVal / Number(budget?.despesaMeta || 1)) * 100
            : 0,
      },
      history,
    };
  }

  async getOperationalDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    // 1. Current Balance (Calculated + Real-time)
    const accountsWithBalance = await this.getAccountsWithRealTimeBalance();
    const totalBalance = accountsWithBalance.reduce(
      (acc, curr) => acc + curr.saldo,
      0,
    );

    // 2. Receivables Info
    const receivables = await this.prisma.lancamentoFinanceiro.findMany({
      where: { tipo: 'RECEITA', status: 'PREVISTO' },
    });
    const recOverdue = receivables
      .filter((t) => t.dataVencimento < todayStart)
      .reduce((s, t) => s + Number(t.valor), 0);
    const recToday = receivables
      .filter(
        (t) => t.dataVencimento >= todayStart && t.dataVencimento <= todayEnd,
      )
      .reduce((s, t) => s + Number(t.valor), 0);
    const recRemaining = receivables
      .filter(
        (t) => t.dataVencimento > todayEnd && t.dataVencimento <= endOfMonth,
      )
      .reduce((s, t) => s + Number(t.valor), 0);

    // 3. Payables Info
    const payables = await this.prisma.lancamentoFinanceiro.findMany({
      where: { tipo: 'DESPESA', status: 'PREVISTO' },
    });
    const payOverdue = payables
      .filter((t) => t.dataVencimento < todayStart)
      .reduce((s, t) => s + Number(t.valor), 0);
    const payToday = payables
      .filter(
        (t) => t.dataVencimento >= todayStart && t.dataVencimento <= todayEnd,
      )
      .reduce((s, t) => s + Number(t.valor), 0);
    const payRemaining = payables
      .filter(
        (t) => t.dataVencimento > todayEnd && t.dataVencimento <= endOfMonth,
      )
      .reduce((s, t) => s + Number(t.valor), 0);

    // 4. Daily Flow (Last 14 Days)
    const dailyFlow: any[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dEnd = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
        999,
      );

      const inVal = await this.prisma.lancamentoFinanceiro.aggregate({
        _sum: { valor: true },
        where: {
          tipo: 'RECEITA',
          status: { in: ['REALIZADO', 'CONCILIADO'] },
          dataPagamento: { gte: dStart, lte: dEnd },
        },
      });
      const outVal = await this.prisma.lancamentoFinanceiro.aggregate({
        _sum: { valor: true },
        where: {
          tipo: 'DESPESA',
          status: { in: ['REALIZADO', 'CONCILIADO'] },
          dataPagamento: { gte: dStart, lte: dEnd },
        },
      });

      dailyFlow.push({
        date: d.toISOString(),
        label: d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        }),
        recebimentos: Number(inVal._sum.valor || 0),
        pagamentos: Number(outVal._sum.valor || 0),
        saldo: Number(inVal._sum.valor || 0) - Number(outVal._sum.valor || 0),
      });
    }

    // 5. Monthly History (Last 6 Months)
    const monthlyHistory: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const startM = new Date(y, m - 1, 1);
      const endM = new Date(y, m, 0, 23, 59, 59, 999);

      const rev = await this.prisma.lancamentoFinanceiro.aggregate({
        _sum: { valor: true },
        where: {
          tipo: 'RECEITA',
          status: { in: ['REALIZADO', 'CONCILIADO'] },
          dataPagamento: { gte: startM, lte: endM },
        },
      });

      monthlyHistory.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short' }),
        valor: Number(rev._sum.valor || 0),
      });
    }

    // === CALCULO DE KPIS DE CENTROS DE CUSTO PARA BI ===
    const ccs = await this.prisma.centroCusto.findMany({
      where: { ativo: true }
    });

    // Fetch all current month realized expenses
    const monthlyExpenses = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        tipo: 'DESPESA',
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        dataPagamento: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // Also fetch rateios for the current month
    const monthlyRateios = await this.prisma.rateioLancamento.findMany({
      where: {
        lancamento: {
          tipo: 'DESPESA',
          status: { in: ['REALIZADO', 'CONCILIADO'] },
          dataPagamento: { gte: startOfMonth, lte: endOfMonth }
        }
      },
      include: {
        lancamento: true
      }
    });

    // Aggregate expenses by Cost Center ID
    const ccRealizado: Record<string, number> = {};
    ccs.forEach(c => ccRealizado[c.id] = 0);

    // 1. Standard bookings without rateios
    monthlyExpenses.forEach(t => {
      if (t.centroCustoId && ccRealizado[t.centroCustoId] !== undefined) {
        ccRealizado[t.centroCustoId] += Number(t.valor);
      }
    });

    // 2. Add rateios
    monthlyRateios.forEach(r => {
      if (r.lancamento?.centroCustoId && ccRealizado[r.lancamento.centroCustoId] !== undefined) {
        ccRealizado[r.lancamento.centroCustoId] += Number(r.valor);
      }
    });


    // 3. Format expensesByCostCenter
    const expensesByCostCenter = ccs
      .map(c => ({
        id: c.id,
        nome: c.nome,
        codigo: c.codigo,
        total: ccRealizado[c.id] || 0,
        cor: c.cor || '#475569'
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    // 4. Format deviations
    const deviations = ccs
      .filter(c => c.orcamentoPrevisto && Number(c.orcamentoPrevisto) > 0)
      .map(c => {
        const realizado = ccRealizado[c.id] || 0;
        const previsto = Number(c.orcamentoPrevisto);
        const desvio = realizado - previsto;
        return {
          id: c.id,
          nome: c.nome,
          codigo: c.codigo,
          previsto,
          realizado,
          desvio,
          limiteMaximo: c.limiteMaximo ? Number(c.limiteMaximo) : null
        };
      })
      .filter(d => d.realizado > 0)
      .sort((a, b) => b.realizado - a.realizado);

    // 5. Format productionTargets
    const productionTargets = ccs
      .filter(c => c.unidadeMedida && c.metaFisica && Number(c.metaFisica) > 0)
      .map(c => {
        const realizadoVal = ccRealizado[c.id] || 0;
        const meta = Number(c.metaFisica);
        const custoUnitario = meta > 0 ? realizadoVal / meta : 0;
        const custoUnitarioPrevisto = c.orcamentoPrevisto ? Number(c.orcamentoPrevisto) / meta : 0;
        
        return {
          id: c.id,
          nome: c.nome,
          codigo: c.codigo,
          metaFisica: meta,
          realizado: realizadoVal,
          unidadeMedida: c.unidadeMedida || 'un',
          custoUnitario,
          custoUnitarioPrevisto
        };
      });

    // 6. Format expensesByTag
    const tagMap: Record<string, number> = {};
    ccs.forEach(c => {
      const tags = c.tags ? c.tags.split(',') : [];
      const realizado = ccRealizado[c.id] || 0;
      if (realizado > 0) {
        tags.forEach(tag => {
          const tName = tag.trim();
          if (tName) {
            tagMap[tName] = (tagMap[tName] || 0) + realizado;
          }
        });
      }
    });

    const expensesByTag = Object.entries(tagMap)
      .map(([tag, total]) => ({ tag, total }))
      .sort((a, b) => b.total - a.total);

    const costCenterKpis = {
      expensesByCostCenter,
      deviations,
      productionTargets,
      expensesByTag
    };

    return {
      receivables: {
        overdue: recOverdue,
        today: recToday,
        remainingMonth: recRemaining,
      },
      payables: {
        overdue: payOverdue,
        today: payToday,
        remainingMonth: payRemaining,
      },
      accounts: accountsWithBalance,
      totalBalance,
      dailyFlow,
      monthlyHistory,
      costCenterKpis,
      lastUpdate: now.toISOString(),
    };
  }


  async getCashFlowDashboard(month?: number, year?: number) {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

    // 1. Current Balance (Saldo Atual) - Realized only
    const accountsWithBalance =
      await this.getAccountsWithRealTimeBalance(endOfMonth);
    const currentBalance = accountsWithBalance.reduce(
      (acc, curr) => acc + curr.saldo,
      0,
    );

    // 2. Receivables (A Receber) for the Period - Including OVERDUE
    const receivables = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        tipo: 'RECEITA',
        OR: [
          { dataVencimento: { lte: endOfMonth } }, // Includes overdue
          { dataPagamento: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    });

    const recReceived = receivables
      .filter(
        (t) =>
          ['REALIZADO', 'CONCILIADO'].includes(t.status) &&
          t.dataPagamento &&
          t.dataPagamento >= startOfMonth &&
          t.dataPagamento <= endOfMonth,
      )
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const recPending = receivables
      .filter((t) => t.status === 'PREVISTO' && t.dataVencimento <= endOfMonth)
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const recTotal = recReceived + recPending;

    // 3. Payables (A Pagar) for the Period - Including OVERDUE
    const payables = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        tipo: 'DESPESA',
        OR: [
          { dataVencimento: { lte: endOfMonth } }, // Includes overdue
          { dataPagamento: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    });

    const payPaid = payables
      .filter(
        (t) =>
          ['REALIZADO', 'CONCILIADO'].includes(t.status) &&
          t.dataPagamento &&
          t.dataPagamento >= startOfMonth &&
          t.dataPagamento <= endOfMonth,
      )
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const payPending = payables
      .filter((t) => t.status === 'PREVISTO' && t.dataVencimento <= endOfMonth)
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const payTotal = payPaid + payPending;

    // 4. Projected Result (Saldo Projetado / Resultado do Mês)
    const projectedBalance = currentBalance + recPending - payPending;

    // 5. Smart Chart (Daily Flow)
    const accounts = await this.prisma.contaBancaria.findMany();
    const preBalanceAccounts = await Promise.all(
      accounts.map(async (acc) => {
        const totalIn = await this.prisma.lancamentoFinanceiro.aggregate({
          _sum: { valor: true },
          where: {
            contaBancariaId: acc.id,
            tipo: 'RECEITA',
            status: { in: ['REALIZADO', 'CONCILIADO'] },
            dataPagamento: { lt: startOfMonth },
          },
        });
        const totalOut = await this.prisma.lancamentoFinanceiro.aggregate({
          _sum: { valor: true },
          where: {
            contaBancariaId: acc.id,
            tipo: 'DESPESA',
            status: { in: ['REALIZADO', 'CONCILIADO'] },
            dataPagamento: { lt: startOfMonth },
          },
        });
        return (
          Number(acc.saldoInicial || 0) +
          Number(totalIn._sum.valor || 0) -
          Number(totalOut._sum.valor || 0)
        );
      }),
    );
    let runningBalance = preBalanceAccounts.reduce((sum, val) => sum + val, 0);

    const daysInMonth = new Date(y, m, 0).getDate();
    const dailyFlow: any[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      const dateStr = date.toDateString();

      const dayInRealized = receivables.filter(
        (t) =>
          ['REALIZADO', 'CONCILIADO'].includes(t.status) &&
          t.dataPagamento &&
          t.dataPagamento.toDateString() === dateStr,
      );
      const dayInProjected = receivables.filter(
        (t) =>
          t.status === 'PREVISTO' &&
          t.dataVencimento.toDateString() === dateStr,
      );

      const dayInVal =
        dayInRealized.reduce((s, t) => s + Number(t.valor), 0) +
        dayInProjected.reduce((s, t) => s + Number(t.valor), 0);

      const dayOutRealized = payables.filter(
        (t) =>
          ['REALIZADO', 'CONCILIADO'].includes(t.status) &&
          t.dataPagamento &&
          t.dataPagamento.toDateString() === dateStr,
      );
      const dayOutProjected = payables.filter(
        (t) =>
          t.status === 'PREVISTO' &&
          t.dataVencimento.toDateString() === dateStr,
      );

      const dayOutVal =
        dayOutRealized.reduce((s, t) => s + Number(t.valor), 0) +
        dayOutProjected.reduce((s, t) => s + Number(t.valor), 0);

      runningBalance += dayInVal - dayOutVal;

      dailyFlow.push({
        date: date.toISOString(),
        label: d.toString(),
        entradas: dayInVal,
        saidas: dayOutVal,
        saldoAcumulado: runningBalance,
      });
    }

    // 6. Transactions List
    const transactionsList = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        OR: [
          { dataVencimento: { gte: startOfMonth, lte: endOfMonth } },
          { dataPagamento: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
      include: {
        categoria: true,
        contaBancaria: true,
      },
      orderBy: { dataVencimento: 'asc' },
    });

    const formattedTransactions = transactionsList.map((t) => ({
      id: t.id,
      data: t.status === 'PREVISTO' ? t.dataVencimento : t.dataPagamento,
      descricao: t.descricao,
      conta: t.contaBancaria?.nome,
      categoria: t.categoria?.nome,
      tipo: t.tipo,
      valor: Number(t.valor),
      status: t.status,
    }));

    return {
      period: { month: m, year: y },
      kpis: {
        saldoAtual: currentBalance,
        aReceber: {
          total: recTotal,
          recebido: recReceived,
          pendente: recPending,
        },
        aPagar: { total: payTotal, pago: payPaid, pendente: payPending },
        saldoProjetado: projectedBalance,
      },
      chart: dailyFlow,
      transactions: formattedTransactions,
      accounts: accountsWithBalance,
      lastUpdate: now.toISOString(),
    };
  }

  async getBalanceSheet(asOf: Date) {
    const referenceDate = new Date(asOf);
    const endOfDay = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
      23,
      59,
      59,
      999,
    );

    const contasReceber = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'RECEITA',
        status: 'PREVISTO',
        dataVencimento: { lte: endOfDay },
      },
    });

    const contasPagar = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'DESPESA',
        status: 'PREVISTO',
        dataVencimento: { lte: endOfDay },
      },
    });

    const contas = await this.prisma.contaBancaria.findMany();
    const contasComSaldo = await Promise.all(
      contas.map(async (acc) => {
        const movimentacoes = await this.prisma.lancamentoFinanceiro.aggregate({
          _sum: { valor: true },
          where: {
            contaBancariaId: acc.id,
            status: { in: ['REALIZADO', 'CONCILIADO'] },
            dataPagamento: { lte: endOfDay },
            tipo: 'RECEITA',
          },
        });

        const saidas = await this.prisma.lancamentoFinanceiro.aggregate({
          _sum: { valor: true },
          where: {
            contaBancariaId: acc.id,
            status: { in: ['REALIZADO', 'CONCILIADO'] },
            dataPagamento: { lte: endOfDay },
            tipo: 'DESPESA',
          },
        });

        const saldo =
          Number(acc.saldoInicial || 0) +
          Number(movimentacoes._sum.valor || 0) -
          Number(saidas._sum.valor || 0);

        return {
          id: acc.id,
          nome: acc.nome,
          banco: acc.banco,
          saldo,
        };
      }),
    );

    const totalCaixaBancos = contasComSaldo.reduce(
      (sum, acc) => sum + acc.saldo,
      0,
    );
    const totalReceber = Number(contasReceber._sum.valor || 0);
    const totalPagar = Number(contasPagar._sum.valor || 0);
    const totalAtivos = totalCaixaBancos + totalReceber;
    const totalPassivos = totalPagar;
    const patrimonioLiquido = totalAtivos - totalPassivos;

    return {
      asOf: endOfDay.toISOString(),
      assets: {
        cashAndBanks: totalCaixaBancos,
        accountsReceivable: totalReceber,
        total: totalAtivos,
        accounts: contasComSaldo,
      },
      liabilities: {
        accountsPayable: totalPagar,
        total: totalPassivos,
      },
      equity: {
        total: patrimonioLiquido,
      },
    };
  }
  private async getAccountsWithRealTimeBalance(lteDate?: Date) {
    const accounts = await this.prisma.contaBancaria.findMany();

    return Promise.all(
      accounts.map(async (acc) => {
        const whereClause: any = {
          contaBancariaId: acc.id,
          status: { in: ['REALIZADO', 'CONCILIADO'] },
        };

        if (lteDate) {
          whereClause.dataPagamento = { lte: lteDate };
        }

        const totalIn = await this.prisma.lancamentoFinanceiro.aggregate({
          _sum: { valor: true },
          where: { ...whereClause, tipo: 'RECEITA' },
        });
        const totalOut = await this.prisma.lancamentoFinanceiro.aggregate({
          _sum: { valor: true },
          where: { ...whereClause, tipo: 'DESPESA' },
        });

        let bal =
          Number(acc.saldoInicial || 0) +
          Number(totalIn._sum.valor || 0) -
          Number(totalOut._sum.valor || 0);

        // TRY REAL-TIME BALANCE from API if integrated
        try {
          const integration = await this.prisma.integracaoBancaria.findUnique({
            where: { contaBancariaId: acc.id },
          });

          if (integration && integration.status === 'CONNECTED') {
            const realTimeBal = await this.bankingService.getAccountBalance(
              acc.id,
            );
            bal = realTimeBal;
          }
        } catch (e: any) {
          // If the integration is bad or disconnected, do not fail.
          console.error(
            `[Dashboard] Failed to fetch real-time balance for ${acc.nome} (${acc.id}):`,
            e.message,
          );
          // Fallback to calculated balance (already set in 'bal')
        }

        return { ...acc, saldo: bal };
      }),
    );
  }
}
