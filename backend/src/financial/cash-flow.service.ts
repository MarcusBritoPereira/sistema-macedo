import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CashFlowFilterDto } from './dto/cash-flow-filter.dto';

@Injectable()
export class CashFlowService {
  constructor(private prisma: PrismaService) {}

  async getCashFlow(filter: CashFlowFilterDto) {
    const { startDate, endDate } = filter;

    // Default to current month if dates not provided
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Ensure dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }

    // 1. Fetch Transactions for the period
    const periodTransactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        dataVencimento: {
          gte: start,
          lte: end,
        },
      },
    });

    const receivables = periodTransactions.filter((t) => t.tipo === 'RECEITA');
    const payables = periodTransactions.filter((t) => t.tipo === 'DESPESA');

    const totalIn = receivables.reduce(
      (sum, item) => sum + Number(item.valor),
      0,
    );
    const totalOut = payables.reduce(
      (sum, item) => sum + Number(item.valor),
      0,
    );
    const balance = totalIn - totalOut;

    const received = receivables
      .filter((t) => t.status === 'REALIZADO' || t.status === 'CONCILIADO')
      .reduce((sum, item) => sum + Number(item.valor), 0);
    const pendingIn = receivables
      .filter((t) => t.status === 'PREVISTO')
      .reduce((sum, item) => sum + Number(item.valor), 0);

    const paid = payables
      .filter((t) => t.status === 'REALIZADO' || t.status === 'CONCILIADO')
      .reduce((sum, item) => sum + Number(item.valor), 0);
    const pendingOut = payables
      .filter((t) => t.status === 'PREVISTO')
      .reduce((sum, item) => sum + Number(item.valor), 0);

    // Sort by date
    const sortedTransactions = periodTransactions.sort(
      (a, b) =>
        new Date(a.dataVencimento).getTime() -
        new Date(b.dataVencimento).getTime(),
    );

    // 2. Fetch Bank Accounts and Calculate Balances (All Time)
    // We need all realized transactions up to now to calculate the real current balance
    const allAccounts = await this.prisma.contaBancaria.findMany({
      include: {
        lancamentos: {
          where: {
            status: { in: ['REALIZADO', 'CONCILIADO'] },
          },
        },
      },
    });

    let totalCurrentBalance = 0;

    const accounts = allAccounts.map((acc) => {
      const accIn = acc.lancamentos
        .filter((l) => l.tipo === 'RECEITA')
        .reduce((sum, l) => sum + Number(l.valor), 0);

      const accOut = acc.lancamentos
        .filter((l) => l.tipo === 'DESPESA')
        .reduce((sum, l) => sum + Number(l.valor), 0);

      const currentBalance = Number(acc.saldoInicial) + accIn - accOut;
      totalCurrentBalance += currentBalance;

      return {
        id: acc.id,
        name: acc.nome,
        bank: acc.banco,
        balance: currentBalance,
        saldoInicialConta: Number(acc.saldoInicial),
      };
    });

    const pastTransactions = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        status: { in: ['REALIZADO', 'CONCILIADO'] },
        OR: [
          { dataPagamento: { lt: start } },
          { dataPagamento: null, dataVencimento: { lt: start } },
        ]
      }
    });

    const pastIn = pastTransactions.filter(t => t.tipo === 'RECEITA').reduce((s, t) => s + Number(t.valor), 0);
    const pastOut = pastTransactions.filter(t => t.tipo === 'DESPESA').reduce((s, t) => s + Number(t.valor), 0);
    const sumSaldosIniciais = accounts.reduce((sum, acc) => sum + acc.saldoInicialConta, 0);
    
    const saldoInicialMes = sumSaldosIniciais + pastIn - pastOut;
    // Entradas e Saídas do mês (considerando tudo, previsto + realizado)
    const saldoFinalMes = saldoInicialMes + totalIn - totalOut;

    // 3. Calculate "Today" and "Remaining" metrics
    // "Today" = Due strictly today
    // "Remaining" = Due > Today AND <= End of Month
    const todayStr = now.toISOString().split('T')[0];
    const todayTransactions = periodTransactions.filter((t) =>
      t.dataVencimento.toISOString().startsWith(todayStr),
    );

    const todayIn = todayTransactions
      .filter((t) => t.tipo === 'RECEITA' && t.status === 'PREVISTO') // Only counts what is NOT paid yet? Or everything due today? User asked "what I have to receive today", implies pending.
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const todayOut = todayTransactions
      .filter((t) => t.tipo === 'DESPESA' && t.status === 'PREVISTO')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    // Remaining in month (Pending Only)
    // We assume "Remaining" means future pending transactions in the current view
    const remainingTransactions = periodTransactions.filter((t) => {
      const tDate = t.dataVencimento.toISOString().split('T')[0];
      return tDate > todayStr && t.status === 'PREVISTO';
    });

    const remainingIn = remainingTransactions
      .filter((t) => t.tipo === 'RECEITA')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const remainingOut = remainingTransactions
      .filter((t) => t.tipo === 'DESPESA')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    // Generate Chart Data (Daily Flow)
    const chartData: any[] = [];
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    let runningBalance = totalCurrentBalance; // Should historically track, but simplified for now

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTransactions = periodTransactions.filter((t) =>
        t.dataVencimento.toISOString().startsWith(dateStr),
      );

      const dayIn = dayTransactions
        .filter((t) => t.tipo === 'RECEITA')
        .reduce((sum, t) => sum + Number(t.valor), 0);
      const dayOut = dayTransactions
        .filter((t) => t.tipo === 'DESPESA')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      // Note: True running balance needs historical data prior to month start.
      // We use simple approximation here based on period totals for chart shape.
      runningBalance += dayIn - dayOut;

      chartData.push({
        label: i.toString(),
        entradas: dayIn,
        saidas: dayOut,
        saldoAcumulado: runningBalance,
      });
    }

    return {
      period: { start, end },
      kpis: {
        saldoAtual: totalCurrentBalance,
        saldoInicialMes,
        saldoFinalMes,
        aReceber: {
          total: totalIn,
          recebido: received,
          pendente: pendingIn,
        },
        aPagar: {
          total: totalOut,
          pago: paid,
          pendente: pendingOut,
        },
        saldoProjetado: totalCurrentBalance + pendingIn - pendingOut,
      },
      summary: {
        totalIn,
        totalOut,
        balance,
        entradasMes: totalIn,
        saidasMes: totalOut,
        previstoReceber: pendingIn,
        recebidoReal: received,
      },
      accounts,
      today: {
        in: todayIn,
        out: todayOut,
      },
      remaining: {
        in: remainingIn,
        out: remainingOut,
      },
      chart: chartData,
      transactions: sortedTransactions,
    };
  }
}
