import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassificacaoDRE, TipoLancamento, StatusLancamento } from '@prisma/client';

@Injectable()
export class FinancialDashboardService {
    constructor(private prisma: PrismaService) { }

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

        const receivables = transactions.filter(t => t.tipo === 'RECEITA');
        const payables = transactions.filter(t => t.tipo === 'DESPESA');

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
        const receitaBruta = totals.RECEITA_RECORRENTE + totals.RECEITA_NAO_RECORRENTE;
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

        const resultadoFinanceiro = totals.RECEITA_FINANCEIRA - totals.DESPESA_FINANCEIRA;

        const lair = ebit + resultadoFinanceiro; // LAIR

        const impostosLucro = totals.IMPOSTOS_LUCRO;

        const lucroLiquido = lair - impostosLucro;

        return {
            period: { start: startDate, end: endDate },
            breakdown: totals,
            summary: {
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
                dataPagamento: { lte: endDate }
            }
        });
        const allOut = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: {
                tipo: 'DESPESA',
                status: { in: ['REALIZADO', 'CONCILIADO'] },
                dataPagamento: { lte: endDate }
            }
        });
        const saldoFinal = Number(allIn._sum.valor || 0) - Number(allOut._sum.valor || 0);

        // Liquidity
        const arVal = Number(contasReceber._sum.valor || 0);
        const apVal = Number(contasPagar._sum.valor || 0);
        const liquidezReduzida = apVal > 0 ? (saldoFinal + arVal) / apVal : 0;
        const liquidezGeral = apVal > 0 ? (saldoFinal + arVal) / apVal : 0;

        // 3. Budget
        const budget = await this.prisma.financialBudget.findUnique({
            where: { mes_ano: { mes: month, ano: year } }
        });

        // 4. Historical Data (Last 12 Months)
        const history: { label: string; receita: number; despesa: number; lucro: number }[] = [];
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
                    dataPagamento: { gte: startM, lte: endM }
                }
            });
            const exp = await this.prisma.lancamentoFinanceiro.aggregate({
                _sum: { valor: true },
                where: {
                    tipo: 'DESPESA',
                    status: { in: ['REALIZADO', 'CONCILIADO'] },
                    dataPagamento: { gte: startM, lte: endM }
                }
            });

            history.push({
                label: `${m}/${y}`,
                receita: Number(rev._sum.valor || 0),
                despesa: Number(exp._sum.valor || 0),
                lucro: Number(rev._sum.valor || 0) - Number(exp._sum.valor || 0)
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
                liquidezGeral
            },
            budget: {
                receitaMeta: Number(budget?.receitaMeta || 0),
                despesaMeta: Number(budget?.despesaMeta || 0),
                receitaPct: Number(budget?.receitaMeta || 0) > 0 ? (receitaVal / Number(budget?.receitaMeta || 1)) * 100 : 0,
                despesaPct: Number(budget?.despesaMeta || 0) > 0 ? (despesaVal / Number(budget?.despesaMeta || 1)) * 100 : 0
            },
            history
        };
    }

    async getOperationalDashboard() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // 1. KPIs for Receivables (Entradas)
        const recOverdue = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: { tipo: 'RECEITA', status: 'PREVISTO', dataVencimento: { lt: startOfToday } }
        });
        const recToday = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: { tipo: 'RECEITA', status: 'PREVISTO', dataVencimento: { gte: startOfToday, lte: endOfToday } }
        });
        const recRemaining = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: { tipo: 'RECEITA', status: 'PREVISTO', dataVencimento: { gt: endOfToday, lte: endOfMonth } }
        });

        // 2. KPIs for Payables (Saídas)
        const payOverdue = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: { tipo: 'DESPESA', status: 'PREVISTO', dataVencimento: { lt: startOfToday } }
        });
        const payToday = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: { tipo: 'DESPESA', status: 'PREVISTO', dataVencimento: { gte: startOfToday, lte: endOfToday } }
        });
        const payRemaining = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: { tipo: 'DESPESA', status: 'PREVISTO', dataVencimento: { gt: endOfToday, lte: endOfMonth } }
        });

        // 3. Financial Accounts (Contas Financeiras)
        const accounts = await this.prisma.contaBancaria.findMany();
        const accountsWithBalance = await Promise.all(accounts.map(async (acc) => {
            // Compute actual balance: Initial + In (Realized) - Out (Realized)
            // Ideally this should be cached/stored, but for now we compute.
            const totalIn = await this.prisma.lancamentoFinanceiro.aggregate({
                _sum: { valor: true },
                where: {
                    contaBancariaId: acc.id,
                    tipo: 'RECEITA',
                    status: { in: ['REALIZADO', 'CONCILIADO'] }
                }
            });
            const totalOut = await this.prisma.lancamentoFinanceiro.aggregate({
                _sum: { valor: true },
                where: {
                    contaBancariaId: acc.id,
                    tipo: 'DESPESA',
                    status: { in: ['REALIZADO', 'CONCILIADO'] }
                }
            });

            const currentBalance = Number(acc.saldoInicial || 0)
                + Number(totalIn._sum.valor || 0)
                - Number(totalOut._sum.valor || 0);

            return {
                id: acc.id,
                nome: acc.nome,
                banco: acc.banco,
                saldo: currentBalance
            };
        }));
        const totalBalance = accountsWithBalance.reduce((sum, acc) => sum + acc.saldo, 0);

        // 4. Daily Cash Flow (Fluxo de Caixa Diário) - Last 7 days + next 7 days (or just 7 previous)
        // Image shows a timeline. Let's do last 7 days.
        const dailyFlow: any[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

            const received = await this.prisma.lancamentoFinanceiro.aggregate({
                _sum: { valor: true },
                where: { tipo: 'RECEITA', status: { in: ['REALIZADO', 'CONCILIADO'] }, dataPagamento: { gte: s, lte: e } }
            });
            const paid = await this.prisma.lancamentoFinanceiro.aggregate({
                _sum: { valor: true },
                where: { tipo: 'DESPESA', status: { in: ['REALIZADO', 'CONCILIADO'] }, dataPagamento: { gte: s, lte: e } }
            });

            dailyFlow.push({
                date: s.toISOString(),
                label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                recebimentos: Number(received._sum.valor || 0),
                pagamentos: Number(paid._sum.valor || 0),
                saldo: Number(received._sum.valor || 0) - Number(paid._sum.valor || 0)
            });
        }

        return {
            receivables: {
                overdue: Number(recOverdue._sum.valor || 0),
                today: Number(recToday._sum.valor || 0),
                remainingMonth: Number(recRemaining._sum.valor || 0)
            },
            payables: {
                overdue: Number(payOverdue._sum.valor || 0),
                today: Number(payToday._sum.valor || 0),
                remainingMonth: Number(payRemaining._sum.valor || 0)
            },
            accounts: accountsWithBalance,
            totalBalance,
            dailyFlow,
            lastUpdate: now.toISOString()
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
            999
        );

        const contasReceber = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: {
                tipo: 'RECEITA',
                status: 'PREVISTO',
                dataVencimento: { lte: endOfDay }
            }
        });

        const contasPagar = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: {
                tipo: 'DESPESA',
                status: 'PREVISTO',
                dataVencimento: { lte: endOfDay }
            }
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
                        tipo: 'RECEITA'
                    }
                });

                const saidas = await this.prisma.lancamentoFinanceiro.aggregate({
                    _sum: { valor: true },
                    where: {
                        contaBancariaId: acc.id,
                        status: { in: ['REALIZADO', 'CONCILIADO'] },
                        dataPagamento: { lte: endOfDay },
                        tipo: 'DESPESA'
                    }
                });

                const saldo = Number(acc.saldoInicial || 0)
                    + Number(movimentacoes._sum.valor || 0)
                    - Number(saidas._sum.valor || 0);

                return {
                    id: acc.id,
                    nome: acc.nome,
                    banco: acc.banco,
                    saldo
                };
            })
        );

        const totalCaixaBancos = contasComSaldo.reduce((sum, acc) => sum + acc.saldo, 0);
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
                accounts: contasComSaldo
            },
            liabilities: {
                accountsPayable: totalPagar,
                total: totalPassivos
            },
            equity: {
                total: patrimonioLiquido
            }
        };
    }
}
