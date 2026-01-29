import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CashFlowFilterDto } from './dto/cash-flow-filter.dto';

@Injectable()
export class CashFlowService {
    constructor(private prisma: PrismaService) { }

    async getCashFlow(filter: CashFlowFilterDto) {
        const { startDate, endDate } = filter;

        // Default to current month if dates not provided
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

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

        const receivables = periodTransactions.filter(t => t.tipo === 'RECEITA');
        const payables = periodTransactions.filter(t => t.tipo === 'DESPESA');

        const totalIn = receivables.reduce((sum, item) => sum + Number(item.valor), 0);
        const totalOut = payables.reduce((sum, item) => sum + Number(item.valor), 0);
        const balance = totalIn - totalOut;

        // Sort by date
        const sortedTransactions = periodTransactions.sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

        // 2. Fetch Bank Accounts and Calculate Balances (All Time)
        // We need all realized transactions up to now to calculate the real current balance
        const allAccounts = await this.prisma.contaBancaria.findMany({
            include: {
                lancamentos: {
                    where: {
                        status: { in: ['REALIZADO', 'CONCILIADO'] }
                    }
                }
            }
        });

        const accounts = allAccounts.map(acc => {
            const accIn = acc.lancamentos
                .filter(l => l.tipo === 'RECEITA')
                .reduce((sum, l) => sum + Number(l.valor), 0);

            const accOut = acc.lancamentos
                .filter(l => l.tipo === 'DESPESA')
                .reduce((sum, l) => sum + Number(l.valor), 0);

            const currentBalance = Number(acc.saldoInicial) + accIn - accOut;

            return {
                id: acc.id,
                name: acc.nome,
                bank: acc.banco,
                balance: currentBalance
            };
        });

        // 3. Calculate "Today" and "Remaining" metrics
        // "Today" = Due strictly today
        // "Remaining" = Due > Today AND <= End of Month
        const todayStr = now.toISOString().split('T')[0];
        const todayTransactions = periodTransactions.filter(t => t.dataVencimento.toISOString().startsWith(todayStr));

        const todayIn = todayTransactions
            .filter(t => t.tipo === 'RECEITA' && t.status === 'PREVISTO') // Only counts what is NOT paid yet? Or everything due today? User asked "what I have to receive today", implies pending.
            .reduce((sum, t) => sum + Number(t.valor), 0);

        const todayOut = todayTransactions
            .filter(t => t.tipo === 'DESPESA' && t.status === 'PREVISTO')
            .reduce((sum, t) => sum + Number(t.valor), 0);

        // Remaining in month (Pending Only)
        // We assume "Remaining" means future pending transactions in the current view
        const remainingTransactions = periodTransactions.filter(t => {
            const tDate = t.dataVencimento.toISOString().split('T')[0];
            return tDate > todayStr && t.status === 'PREVISTO';
        });

        const remainingIn = remainingTransactions
            .filter(t => t.tipo === 'RECEITA')
            .reduce((sum, t) => sum + Number(t.valor), 0);

        const remainingOut = remainingTransactions
            .filter(t => t.tipo === 'DESPESA')
            .reduce((sum, t) => sum + Number(t.valor), 0);


        return {
            period: { start, end },
            summary: {
                totalIn,
                totalOut,
                balance,
            },
            accounts, // New
            today: {  // New
                in: todayIn,
                out: todayOut
            },
            remaining: { // New
                in: remainingIn,
                out: remainingOut
            },
            transactions: sortedTransactions,
        };
    }
}
