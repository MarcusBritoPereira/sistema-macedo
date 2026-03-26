import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TipoLancamento, StatusLancamento } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class FinancialTransactionsService {
  constructor(private prisma: PrismaService) {}

  private readonly transactionInclude: Prisma.LancamentoFinanceiroInclude = {
    categoria: true,
    centroCusto: true,
    cliente: true,
    contrato: true,
    fornecedor: true,
    contaBancaria: true,
  };

  async create(
    data: CreateTransactionDto,
    usuarioId: string,
  ) {
    const createData = this.toCreateInput(data);
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.lancamentoFinanceiro.create({ data: createData });

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

      // Search for matching unreconciled bank statements
      const suggestedStatements = await this.findMatchingStatements(
        tx,
        transaction,
      );

      return { ...transaction, suggestedStatements };
    });
  }

  private async findMatchingStatements(
    tx: Prisma.TransactionClient,
    transaction: { valor: any; dataVencimento: Date; tipo: string },
  ) {
    const marginDays = 7;
    const startDate = new Date(transaction.dataVencimento);
    startDate.setDate(startDate.getDate() - marginDays);
    const endDate = new Date(transaction.dataVencimento);
    endDate.setDate(endDate.getDate() + marginDays);

    const expectedStatementType =
      transaction.tipo === 'RECEITA' ? 'CREDIT' : 'DEBIT';

    return tx.extratoBancario.findMany({
      where: {
        valor: Number(transaction.valor),
        tipo: expectedStatementType,
        conciliado: false,
        data: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        descricao: true,
        valor: true,
        data: true,
        tipo: true,
      },
      take: 5,
      orderBy: { data: 'desc' },
    });
  }

  async createMany(
    data: CreateTransactionDto[],
    usuarioId: string,
  ) {
    const createManyData = data.map((item) => this.toCreateManyInput(item));
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.lancamentoFinanceiro.createMany({
        data: createManyData,
        skipDuplicates: true,
      });

      await tx.logAuditoria.create({
        data: {
          acao: `Importou em massa ${result.count} lançamentos financeiros`,
          tabela: 'lancamentos_financeiros',
          registroId: 'BULK_IMPORT',
          valorNovo: `Foram importados ${result.count} registros`,
          motivo: 'Importação via CSV',
          usuarioId,
        },
      });

      return {
        created: result.count,
        skipped: createManyData.length - result.count,
      };
    });
  }

  async findAll(params: {
    type?: TipoLancamento;
    status?: StatusLancamento;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { type, status, startDate, endDate, categoryId, search, skip, take } =
      params;
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
        {
          cliente: { nomeFantasia: { contains: search, mode: 'insensitive' } },
        },
        {
          fornecedor: {
            nomeFantasia: { contains: search, mode: 'insensitive' },
          },
        },
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
      }),
    ]);

    return { total, data };
  }

  findOne(id: string) {
    return this.prisma.lancamentoFinanceiro.findUnique({
      where: { id },
      include: this.transactionInclude,
    });
  }

  async update(
    id: string,
    data: UpdateTransactionDto,
    usuarioId: string,
  ) {
    const updateData = this.toUpdateInput(data);
    return this.prisma.$transaction(async (tx) => {
      const oldTransaction = await tx.lancamentoFinanceiro.findUnique({
        where: { id },
        include: this.transactionInclude,
      });
      const transaction = await tx.lancamentoFinanceiro.update({
        where: { id },
        data: updateData,
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

  private toCreateInput(
    data: CreateTransactionDto,
  ): Prisma.LancamentoFinanceiroCreateInput {
    return {
      descricao: data.descricao,
      valor: data.valor,
      dataVencimento: new Date(data.dataVencimento),
      dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : undefined,
      dataCompetencia: data.dataCompetencia
        ? new Date(data.dataCompetencia)
        : undefined,
      tipo: data.tipo,
      status: data.status || 'PREVISTO',
      observacoes: data.observacoes,
      contaBancaria: data.contaBancariaId
        ? { connect: { id: data.contaBancariaId } }
        : undefined,
      categoria: data.categoriaId ? { connect: { id: data.categoriaId } } : undefined,
      centroCusto: data.centroCustoId
        ? { connect: { id: data.centroCustoId } }
        : undefined,
      contrato: data.contratoId ? { connect: { id: data.contratoId } } : undefined,
      cliente: data.clienteId ? { connect: { id: data.clienteId } } : undefined,
      fornecedor: data.fornecedorId
        ? { connect: { id: data.fornecedorId } }
        : undefined,
    };
  }

  private toCreateManyInput(
    data: CreateTransactionDto,
  ): Prisma.LancamentoFinanceiroCreateManyInput {
    return {
      descricao: data.descricao,
      valor: data.valor,
      dataVencimento: new Date(data.dataVencimento),
      dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
      dataCompetencia: data.dataCompetencia ? new Date(data.dataCompetencia) : null,
      tipo: data.tipo,
      status: data.status || 'PREVISTO',
      observacoes: data.observacoes || null,
      contaBancariaId: data.contaBancariaId || null,
      categoriaId: data.categoriaId || null,
      centroCustoId: data.centroCustoId || null,
      contratoId: data.contratoId || null,
      clienteId: data.clienteId || null,
      fornecedorId: data.fornecedorId || null,
    };
  }

  private toUpdateInput(
    data: UpdateTransactionDto,
  ): Prisma.LancamentoFinanceiroUpdateInput {
    return {
      descricao: data.descricao,
      valor: data.valor,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
      dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : undefined,
      dataCompetencia: data.dataCompetencia
        ? new Date(data.dataCompetencia)
        : undefined,
      tipo: data.tipo,
      status: data.status,
      observacoes: data.observacoes,
      contaBancaria: data.contaBancariaId
        ? { connect: { id: data.contaBancariaId } }
        : undefined,
      categoria: data.categoriaId ? { connect: { id: data.categoriaId } } : undefined,
      centroCusto: data.centroCustoId
        ? { connect: { id: data.centroCustoId } }
        : undefined,
      contrato: data.contratoId ? { connect: { id: data.contratoId } } : undefined,
      cliente: data.clienteId ? { connect: { id: data.clienteId } } : undefined,
      fornecedor: data.fornecedorId
        ? { connect: { id: data.fornecedorId } }
        : undefined,
    };
  }
}
