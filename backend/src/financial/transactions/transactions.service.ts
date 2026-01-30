import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TipoLancamento, StatusLancamento } from '@prisma/client';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class FinancialTransactionsService {
    constructor(
        private prisma: PrismaService,
        private auditLog: AuditLogService
    ) { }

    async create(data: Prisma.LancamentoFinanceiroCreateInput, usuarioId: string) {
        const transaction = await this.prisma.lancamentoFinanceiro.create({ data });

        await this.auditLog.createLog({
            acao: `Adicionou o ${transaction.tipo === 'RECEITA' ? 'recebimento' : 'pagamento'} "${transaction.descricao}"`,
            tabela: 'lancamentos_financeiros',
            registroId: transaction.id,
            valorNovo: JSON.stringify(transaction),
            motivo: 'Criação manual',
            usuarioId
        });

        return transaction;
    }

    findAll(type?: TipoLancamento, status?: StatusLancamento) {
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
            orderBy: { dataVencimento: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.lancamentoFinanceiro.findUnique({
            where: { id },
            include: {
                categoria: true,
                centroCusto: true,
                cliente: true,
                contrato: true,
                fornecedor: true,
                contaBancaria: true,
            },
        });
    }

    async update(id: string, data: Prisma.LancamentoFinanceiroUpdateInput, usuarioId: string) {
        const oldTransaction = await this.findOne(id);
        const transaction = await this.prisma.lancamentoFinanceiro.update({
            where: { id },
            data,
        });

        await this.auditLog.createLog({
            acao: `Editou o ${transaction.tipo === 'RECEITA' ? 'recebimento' : 'pagamento'} "${transaction.descricao}"`,
            tabela: 'lancamentos_financeiros',
            registroId: transaction.id,
            valorAntigo: JSON.stringify(oldTransaction),
            valorNovo: JSON.stringify(transaction),
            motivo: 'Edição manual',
            usuarioId
        });

        return transaction;
    }

    async remove(id: string, usuarioId: string) {
        const transaction = await this.findOne(id);
        await this.prisma.lancamentoFinanceiro.delete({
            where: { id },
        });

        await this.auditLog.createLog({
            acao: `Excluiu o ${transaction?.tipo === 'RECEITA' ? 'recebimento' : 'pagamento'} "${transaction?.descricao}"`,
            tabela: 'lancamentos_financeiros',
            registroId: id,
            valorAntigo: JSON.stringify(transaction),
            motivo: 'Exclusão manual',
            usuarioId
        });

        return transaction;
    }
}
