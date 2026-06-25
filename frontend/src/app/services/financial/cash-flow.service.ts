import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CashFlowData {
  cards: {
    initialBalance: number;
    totalReceived: number;
    totalSpent: number;
    finalBalance: number;
    receivableClients: number;
    cashBurn: number;
  };
  monthlyReceived: number[];
  clientReceivedVsReceivable: {
    client: string;
    received: number;
    receivable: number;
  }[];
  receivedVsSpent: {
    month: string;
    received: number;
    spent: number;
    balance: number;
  }[];
  expensesByWork: {
    work: string;
    value: number;
  }[];
  averageTicket: number;
  biggestPendingClient: {
    name: string;
    value: number;
  };
  alerts: {
    color: string;
    text: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class CashFlowService {

  constructor(private api: ApiService) { }

  getCashFlow(): Observable<CashFlowData> {
    const curYear = new Date().getFullYear();
    const startOfYearStr = `${curYear}-01-01`;
    const endOfYearStr = `${curYear}-12-31`;

    return this.api.get<any>(`financial/cash-flow?startDate=${startOfYearStr}&endDate=${endOfYearStr}`).pipe(
      map((response: any) => {
        const transactions = response.transactions || [];
        const accounts = response.accounts || [];

        // 1. Calculate Current Month KPIs
        const now = new Date();
        const curMonth = now.getMonth(); // 0-11

        const currentMonthTransactions = transactions.filter((t: any) => {
          const d = new Date(t.dataVencimento);
          return d.getFullYear() === curYear && d.getMonth() === curMonth;
        });

        // Current total balance across all accounts (actual today)
        const totalCurrentBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

        // Realized flows in the current month (status: REALIZADO or CONCILIADO)
        const curMonthReceivedRealized = currentMonthTransactions
          .filter((t: any) => t.tipo === 'RECEITA' && (t.status === 'REALIZADO' || t.status === 'CONCILIADO'))
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        const curMonthSpentRealized = currentMonthTransactions
          .filter((t: any) => t.tipo === 'DESPESA' && (t.status === 'REALIZADO' || t.status === 'CONCILIADO'))
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        // Initial balance of current month
        const initialBalance = totalCurrentBalance - curMonthReceivedRealized + curMonthSpentRealized;

        // Total received in current month (realized)
        const totalReceived = curMonthReceivedRealized;

        // Total spent in current month (realized)
        const totalSpent = curMonthSpentRealized;

        // Final balance of the month (projected)
        const curMonthReceivedAll = currentMonthTransactions
          .filter((t: any) => t.tipo === 'RECEITA')
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        const curMonthSpentAll = currentMonthTransactions
          .filter((t: any) => t.tipo === 'DESPESA')
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        const finalBalance = initialBalance + curMonthReceivedAll - curMonthSpentAll;

        // Receivable clients (pending receipts in the current month)
        const receivableClients = currentMonthTransactions
          .filter((t: any) => t.tipo === 'RECEITA' && t.status === 'PREVISTO')
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        // Cash Burn (spent per week in the current month)
        const cashBurn = totalSpent / 4.33;

        // 2. Monthly received (realized inputs grouped by month of the current year)
        const monthlyReceived = Array(12).fill(0);
        transactions.forEach((t: any) => {
          const d = new Date(t.dataVencimento);
          if (d.getFullYear() === curYear && t.tipo === 'RECEITA' && (t.status === 'REALIZADO' || t.status === 'CONCILIADO')) {
            monthlyReceived[d.getMonth()] += Number(t.valor || 0);
          }
        });

        // 3. Client received vs receivable
        const clientMap = new Map<string, { received: number; receivable: number }>();
        transactions.forEach((t: any) => {
          if (t.tipo === 'RECEITA') {
            const clientName = t.cliente?.nomeFantasia || t.cliente?.razaoSocial || t.fornecedorNome || 'Outros';
            if (!clientMap.has(clientName)) {
              clientMap.set(clientName, { received: 0, receivable: 0 });
            }
            const clientData = clientMap.get(clientName)!;
            const val = Number(t.valor || 0);
            if (t.status === 'REALIZADO' || t.status === 'CONCILIADO') {
              clientData.received += val;
            } else if (t.status === 'PREVISTO') {
              clientData.receivable += val;
            }
          }
        });

        const clientReceivedVsReceivable = Array.from(clientMap.entries())
          .map(([client, data]) => ({
            client,
            received: data.received,
            receivable: data.receivable
          }))
          .sort((a, b) => (b.received + b.receivable) - (a.received + a.receivable))
          .slice(0, 6);

        // 4. Received vs Spent historical metrics (current year months)
        const monthsShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const receivedVsSpent = monthsShort.map((month, index) => {
          const monthTrans = transactions.filter((t: any) => {
            const d = new Date(t.dataVencimento);
            return d.getFullYear() === curYear && d.getMonth() === index;
          });

          const received = monthTrans
            .filter((t: any) => t.tipo === 'RECEITA' && (t.status === 'REALIZADO' || t.status === 'CONCILIADO'))
            .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

          const spent = monthTrans
            .filter((t: any) => t.tipo === 'DESPESA' && (t.status === 'REALIZADO' || t.status === 'CONCILIADO'))
            .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

          return {
            month,
            received,
            spent,
            balance: received - spent
          };
        });

        // 5. Expenses by work
        const workMap = new Map<string, number>();
        transactions.forEach((t: any) => {
          if (t.tipo === 'DESPESA') {
            const workName = t.obra?.nome || t.descricao || 'Despesas Gerais';
            const val = Number(t.valor || 0);
            workMap.set(workName, (workMap.get(workName) || 0) + val);
          }
        });

        const expensesByWork = Array.from(workMap.entries())
          .map(([work, value]) => ({ work, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);

        // 6. Average realized ticket
        const allRealizedReceipts = transactions.filter((t: any) => t.tipo === 'RECEITA' && (t.status === 'REALIZADO' || t.status === 'CONCILIADO'));
        const totalRealizedReceiptsVal = allRealizedReceipts.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
        const averageTicket = allRealizedReceipts.length > 0 ? (totalRealizedReceiptsVal / allRealizedReceipts.length) : 0;

        // 7. Biggest pending client
        let biggestPendingClient = { name: 'Nenhum', value: 0 };
        clientReceivedVsReceivable.forEach((c) => {
          if (c.receivable > biggestPendingClient.value) {
            biggestPendingClient = { name: c.client, value: c.receivable };
          }
        });

        // 8. Dynamic Intelligence Insights & Alerts (Orange changed to Red)
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const next7DaysIn = transactions
          .filter((t: any) => t.tipo === 'RECEITA' && t.status === 'PREVISTO' && new Date(t.dataVencimento) <= sevenDaysLater && new Date(t.dataVencimento) >= now)
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        const next7DaysOut = transactions
          .filter((t: any) => t.tipo === 'DESPESA' && t.status === 'PREVISTO' && new Date(t.dataVencimento) <= sevenDaysLater && new Date(t.dataVencimento) >= now)
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        const totalExpensesAllTime = expensesByWork.reduce((sum: number, w: any) => sum + w.value, 0);
        const topWork = expensesByWork[0];
        const topWorkPct = totalExpensesAllTime > 0 && topWork ? Math.round((topWork.value / totalExpensesAllTime) * 100) : 0;

        const alerts = [
          { color: 'green', text: `${next7DaysIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em recebimentos previstos para os próximos 7 dias` },
          { color: 'red', text: `${next7DaysOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em pagamentos críticos na próxima semana` },
          topWork ? { color: 'red', text: `${topWork.work} concentrou ${topWorkPct}% das despesas do período` } : { color: 'blue', text: 'Nenhuma obra concentrou despesas relevantes' },
          { color: 'blue', text: `Saldo projetado para o fim do ano: ${finalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` }
        ];

        return {
          cards: {
            initialBalance,
            totalReceived,
            totalSpent,
            finalBalance,
            receivableClients,
            cashBurn
          },
          monthlyReceived,
          clientReceivedVsReceivable,
          receivedVsSpent,
          expensesByWork,
          averageTicket,
          biggestPendingClient,
          alerts
        };
      })
    );
  }
}
