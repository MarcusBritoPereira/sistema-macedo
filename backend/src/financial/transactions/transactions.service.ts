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

    async findAll(params: {
        type?: TipoLancamento,
        status?: StatusLancamento,
        startDate?: string,
        endDate?: string,
        categoryId?: string,
        search?: string,
        skip?: number,
        take?: number
    }) {
        const { type, status, startDate, endDate, categoryId, search, skip, take } = params;
        const where: Prisma.LancamentoFinanceiroWhereInput = {};

        if (type) where.tipo = type;
        if (status) where.status = status;
        if (categoryId) where.categoriaId = categoryId;

        if (startDate && endDate) {
            where.dataVencimento = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        if (search) {
            where.OR = [
                { descricao: { contains: search, mode: 'insensitive' } },
                { categoria: { nome: { contains: search, mode: 'insensitive' } } },
                { cliente: { razaoSocial: { contains: search, mode: 'insensitive' } } },
                { cliente: { nomeFantasia: { contains: search, mode: 'insensitive' } } },
                { fornecedor: { nomeFantasia: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [total, data] = await this.prisma.$transaction([
            this.prisma.lancamentoFinanceiro.count({ where }),
            this.prisma.lancamentoFinanceiro.findMany({
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
                orderBy: { dataVencimento: 'desc' }, // Changed to desc for better recent view
            })
        ]);

        return { total, data };
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
