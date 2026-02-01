import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TipoLancamento, StatusLancamento } from '@prisma/client';

@Injectable()
export class FinancialTransactionsService {
    constructor(
        private prisma: PrismaService
    ) { }

    private readonly transactionInclude: Prisma.LancamentoFinanceiroInclude = {
        categoria: true,
        centroCusto: true,
        cliente: true,
        contrato: true,
        fornecedor: true,
        contaBancaria: true,
    };

    async create(data: Prisma.LancamentoFinanceiroCreateInput, usuarioId: string) {
        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.lancamentoFinanceiro.create({ data });

            await tx.logAuditoria.create({
                data: {
                    acao: `Adicionou o ${transaction.tipo === 'RECEITA' ? 'recebimento' : 'pagamento'} "${transaction.descricao}"`,
                    tabela: 'lancamentos_financeiros',
                    registroId: transaction.id,
                    valorNovo: JSON.stringify(transaction),
                    motivo: 'Criação manual',
                    usuarioId,
                },
            });

            return transaction;
        });
    }

    findAll(type?: TipoLancamento, status?: StatusLancamento, skip = 0, take = 50) {
        const where: Prisma.LancamentoFinanceiroWhereInput = {};
        if (type) where.tipo = type;
        if (status) where.status = status;

        return this.prisma.lancamentoFinanceiro.findMany({
            where,
            include: {
                categoria: true,
                centroCusto: true,
                cliente: true,
                fornecedor: true,
                contaBancaria: true,
            },
            skip,
            take,
            orderBy: { dataVencimento: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.lancamentoFinanceiro.findUnique({
            where: { id },
            include: this.transactionInclude,
        });
    }

    async update(id: string, data: Prisma.LancamentoFinanceiroUpdateInput, usuarioId: string) {
        return this.prisma.$transaction(async (tx) => {
            const oldTransaction = await tx.lancamentoFinanceiro.findUnique({
                where: { id },
                include: this.transactionInclude,
            });
            const transaction = await tx.lancamentoFinanceiro.update({
                where: { id },
                data,
            });

            await tx.logAuditoria.create({
                data: {
                    acao: `Editou o ${transaction.tipo === 'RECEITA' ? 'recebimento' : 'pagamento'} "${transaction.descricao}"`,
                    tabela: 'lancamentos_financeiros',
                    registroId: transaction.id,
                    valorAntigo: JSON.stringify(oldTransaction),
                    valorNovo: JSON.stringify(transaction),
                    motivo: 'Edição manual',
                    usuarioId,
                },
            });

            return transaction;
        });
    }

    async remove(id: string, usuarioId: string) {
        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.lancamentoFinanceiro.findUnique({
                where: { id },
                include: this.transactionInclude,
            });
            await tx.lancamentoFinanceiro.delete({
                where: { id },
            });

            await tx.logAuditoria.create({
                data: {
                    acao: `Excluiu o ${transaction?.tipo === 'RECEITA' ? 'recebimento' : 'pagamento'} "${transaction?.descricao}"`,
                    tabela: 'lancamentos_financeiros',
                    registroId: id,
                    valorAntigo: JSON.stringify(transaction),
                    motivo: 'Exclusão manual',
                    usuarioId,
                },
            });

            return transaction;
        });
    }
}
