import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatusLancamento } from '@prisma/client';
import { AuditLogService } from '../../audit-log/audit-log.service';

type EntitySuggestion = {
  id: string;
  nome: string;
  confidence: number;
};

@Injectable()
export class ReconciliationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  private normalizeText(value?: string | null): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractDigits(value?: string | null): string {
    return (value || '').replace(/\D/g, '');
  }

  private scoreMatch(
    description: string,
    names: string[],
    documents: string[],
  ): number {
    let score = 0;
    const normalizedDescription = this.normalizeText(description);
    const descriptionDigits = this.extractDigits(description);

    for (const name of names) {
      const normalizedName = this.normalizeText(name);
      if (!normalizedName || normalizedName.length < 3) continue;

      if (normalizedDescription === normalizedName) {
        score += 120;
      }

      if (normalizedDescription.includes(normalizedName)) {
        score += 100;
      }

      const nameTokens = normalizedName
        .split(' ')
        .filter((token) => token.length >= 4);
      for (const token of nameTokens) {
        if (normalizedDescription.includes(token)) {
          score += 14;
        }
      }
    }

    for (const document of documents) {
      const digits = this.extractDigits(document);
      if (digits.length >= 11 && descriptionDigits.includes(digits)) {
        score += 120;
      }
    }

    return score;
  }

  private async suggestEntityForStatement(statement: {
    tipo: 'CREDIT' | 'DEBIT';
    descricao: string;
  }): Promise<{ cliente?: EntitySuggestion; fornecedor?: EntitySuggestion }> {
    if (statement.tipo === 'CREDIT') {
      const clients = await this.prisma.cliente.findMany({
        where: { ativo: true },
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          cpf: true,
        },
      });

      const ranked = clients
        .map((client) => ({
          id: client.id,
          nome: client.nomeFantasia || client.razaoSocial,
          confidence: this.scoreMatch(
            statement.descricao,
            [client.nomeFantasia || '', client.razaoSocial || ''],
            [client.cnpj || '', client.cpf || ''],
          ),
        }))
        .filter((client) => client.confidence >= 40)
        .sort((a, b) => b.confidence - a.confidence);

      if (ranked.length > 0) {
        return { cliente: ranked[0] };
      }

      return {};
    }

    const suppliers = await this.prisma.fornecedor.findMany({
      where: { ativo: true },
      select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true },
    });

    const ranked = suppliers
      .map((supplier) => ({
        id: supplier.id,
        nome: supplier.nomeFantasia,
        confidence: this.scoreMatch(
          statement.descricao,
          [supplier.nomeFantasia || '', supplier.razaoSocial || ''],
          [supplier.cnpj || ''],
        ),
      }))
      .filter((supplier) => supplier.confidence >= 40)
      .sort((a, b) => b.confidence - a.confidence);

    if (ranked.length > 0) {
      return { fornecedor: ranked[0] };
    }

    return {};
  }

  async getBankStatements(contaBancariaId: string, filters?: any) {
    const where: any = {
      importacao: { contaBancariaId },
    };

    if (filters?.startDate || filters?.endDate) {
      where.data = {};
      if (filters.startDate) where.data.gte = new Date(filters.startDate);
      if (filters.endDate) where.data.lte = new Date(filters.endDate);
    }

    if (filters?.status === 'PENDING') where.conciliado = false;
    if (filters?.status === 'CONCILIATED') where.conciliado = true;

    if (filters?.search) {
      const num = Number(filters.search);
      where.OR = [
        { descricao: { contains: filters.search, mode: 'insensitive' } },
        {
          conciliacoes: {
            some: {
              lancamentoFinanceiro: {
                categoria: {
                  nome: { contains: filters.search, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
      if (!isNaN(num)) {
        where.OR.push({ valor: num });
      }
    }

    // Filter by Category (requires joining relations)
    // Since Category is on LancamentoFinanceiro, which is linked via Conciliacao
    if (filters?.categoryId) {
      where.conciliacoes = {
        some: {
          lancamentoFinanceiro: {
            categoriaId: filters.categoryId,
          },
        },
      };
    }

    const statements = await this.prisma.extratoBancario.findMany({
      where,
      include: {
        conciliacoes: {
          include: {
            lancamentoFinanceiro: true,
          },
        },
        importacao: true,
      },
      orderBy: { data: 'desc' },
    });

    const enrichedStatements = await Promise.all(
      statements.map(async (statement) => {
        const suggestion = await this.suggestEntityForStatement({
          tipo: statement.tipo,
          descricao: statement.descricao,
        });

        return {
          ...statement,
          suggestedEntity: suggestion,
        };
      }),
    );

    return enrichedStatements;
  }

  async findSuggestedMatches(statementId: string) {
    const statement = await this.prisma.extratoBancario.findUnique({
      where: { id: statementId },
    });

    if (!statement) throw new NotFoundException('Extrato não encontrado');

    // Basic suggestion: exact value and close date (+/- 7 days)
    const marginDays = 7;
    const startDate = new Date(statement.data);
    startDate.setDate(startDate.getDate() - marginDays);
    const endDate = new Date(statement.data);
    endDate.setDate(endDate.getDate() + marginDays);

    return this.prisma.lancamentoFinanceiro.findMany({
      where: {
        valor: statement.valor,
        dataVencimento: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELADO' },
        conciliacoes: { none: {} }, // Only those not yet conciliated
      },
      include: {
        categoria: true,
        centroCusto: true,
      },
    });
  }

  async linkManual(
    statementId: string,
    lancamentoId: string,
    confirmacaoManual?: boolean,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const statement = await tx.extratoBancario.findUnique({
        where: { id: statementId },
      });
      const lancamento = await tx.lancamentoFinanceiro.findUnique({
        where: { id: lancamentoId },
      });

      if (!statement || !lancamento)
        throw new NotFoundException('Extrato ou Lançamento não encontrado');
      if (!confirmacaoManual)
        throw new BadRequestException(
          'Confirmação manual obrigatória para conciliar',
        );
      if (statement.conciliado)
        throw new BadRequestException('Extrato já conciliado');

      // Create link
      await tx.conciliacaoBancaria.create({
        data: {
          extratoBancarioId: statementId,
          lancamentoFinanceiroId: lancamentoId,
          type: 'MANUAL_LINK',
        },
      });

      // Update statuses
      await tx.extratoBancario.update({
        where: { id: statementId },
        data: { conciliado: true },
      });

      await tx.lancamentoFinanceiro.update({
        where: { id: lancamentoId },
        data: {
          status: 'CONCILIADO',
          dataPagamento: statement.data, // Use bank date as payment date
        },
      });

      // Audit Log
      if (userId) {
        await this.auditLogService.createLog({
          acao: 'CONCILIACAO_MANUAL',
          tabela: 'conciliacoes_bancarias',
          registroId: lancamentoId, // Tracking the financial record
          motivo: `Conciliação manual com extrato ${statementId}`,
          usuarioId: userId,
          valorAntigo: 'PREVISTO/REALIZADO',
          valorNovo: 'CONCILIADO',
        });
      }

      return { success: true };
    });
  }

  async createAndLink(
    statementId: string,
    data: any,
    confirmacaoManual?: boolean,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const statement = await tx.extratoBancario.findUnique({
        where: { id: statementId },
        include: { importacao: true },
      });
      if (!statement) throw new NotFoundException('Extrato não encontrado');
      if (!confirmacaoManual)
        throw new BadRequestException(
          'Confirmação manual obrigatória para conciliar',
        );
      if (statement.conciliado)
        throw new BadRequestException('Extrato já conciliado');

      // Sanitize optional fields ('' -> null)
      const sanitize = (val: any) =>
        val === '' || val === 'null' || val === undefined ? null : val;

      const categoriaId = sanitize(data.categoriaId);
      const centroCustoId = sanitize(data.centroCustoId);
      let fornecedorId = sanitize(data.fornecedorId);
      let clienteId = sanitize(data.clienteId);
      const dataCompetencia = sanitize(data.dataCompetencia);
      const competenciaDate = dataCompetencia
        ? new Date(dataCompetencia)
        : statement.data;
      const isTransfer =
        data?.isTransfer === true || data?.isTransfer === 'true';
      const contaDestinoId = sanitize(data.contaDestinoId);

      if (!isTransfer && !fornecedorId && !clienteId) {
        const suggestion = await this.suggestEntityForStatement({
          tipo: statement.tipo,
          descricao: data.descricao || statement.descricao,
        });

        if (statement.tipo === 'CREDIT') {
          clienteId = suggestion.cliente?.id || null;
        } else {
          fornecedorId = suggestion.fornecedor?.id || null;
        }
      }

      let createdLancamentoId: string;

      if (isTransfer) {
        if (!contaDestinoId) {
          throw new BadRequestException(
            'Conta de destino é obrigatória para transferência',
          );
        }

        const contaOrigemId = statement.importacao?.contaBancariaId;
        if (!contaOrigemId) {
          throw new BadRequestException(
            'Conta de origem não encontrada no extrato',
          );
        }

        const tipoOrigem = statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';
        const tipoDestino = tipoOrigem === 'RECEITA' ? 'DESPESA' : 'RECEITA';
        const descricaoTransferencia =
          data.descricao ||
          `Transferência entre contas: ${statement.descricao}`;

        const lancamentoOrigem = await tx.lancamentoFinanceiro.create({
          data: {
            descricao: descricaoTransferencia,
            valor: statement.valor,
            tipo: tipoOrigem,
            dataVencimento: statement.data,
            dataPagamento: statement.data,
            dataCompetencia: competenciaDate,
            status: 'CONCILIADO',
            contaBancariaId: contaOrigemId,
            observacoes: `Transferência conciliada: ${statement.descricao}`,
          },
        });

        await tx.lancamentoFinanceiro.create({
          data: {
            descricao: descricaoTransferencia,
            valor: statement.valor,
            tipo: tipoDestino,
            dataVencimento: statement.data,
            dataPagamento: statement.data,
            dataCompetencia: competenciaDate,
            status: 'REALIZADO',
            contaBancariaId: contaDestinoId,
            observacoes: `Transferência gerada via conciliação: ${statement.descricao}`,
          },
        });

        await tx.conciliacaoBancaria.create({
          data: {
            extratoBancarioId: statementId,
            lancamentoFinanceiroId: lancamentoOrigem.id,
            type: 'MANUAL_CREATE',
          },
        });

        await tx.extratoBancario.update({
          where: { id: statementId },
          data: { conciliado: true },
        });

        createdLancamentoId = lancamentoOrigem.id;
      } else {
        // 1. Create Lancamento
        const lancamento = await tx.lancamentoFinanceiro.create({
          data: {
            descricao: data.descricao || statement.descricao,
            valor: statement.valor,
            tipo: statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA',
            dataVencimento: statement.data,
            dataPagamento: statement.data,
            dataCompetencia: competenciaDate,
            status: 'CONCILIADO',
            categoriaId: categoriaId,
            centroCustoId: centroCustoId,
            clienteId: clienteId,
            fornecedorId: fornecedorId, // Added missing mapping
            observacoes: `Criado via conciliação bancária: ${statement.descricao}`,
          },
        });

        // 2. Create link
        await tx.conciliacaoBancaria.create({
          data: {
            extratoBancarioId: statementId,
            lancamentoFinanceiroId: lancamento.id,
            type: 'MANUAL_CREATE',
          },
        });

        // 3. Update statement
        await tx.extratoBancario.update({
          where: { id: statementId },
          data: { conciliado: true },
        });

        createdLancamentoId = lancamento.id;
      }

      // Audit Log
      if (userId && createdLancamentoId) {
        await this.auditLogService.createLog({
          acao: 'CRIACAO_E_CONCILIACAO',
          tabela: 'lancamentos_financeiros',
          registroId: createdLancamentoId,
          motivo: `Criação e conciliação via extrato ${statementId}`,
          usuarioId: userId,
          valorAntigo: undefined,
          valorNovo: 'CONCILIADO',
        });
      }

      return { id: createdLancamentoId };
    });
  }

  async unlink(conciliacaoId: string, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.conciliacaoBancaria.findUnique({
        where: { id: conciliacaoId },
      });

      if (!link) throw new NotFoundException('Conciliação não encontrada');

      await tx.conciliacaoBancaria.delete({ where: { id: conciliacaoId } });

      await tx.extratoBancario.update({
        where: { id: link.extratoBancarioId },
        data: { conciliado: false },
      });

      await tx.lancamentoFinanceiro.update({
        where: { id: link.lancamentoFinanceiroId },
        data: { status: 'REALIZADO' }, // Revert to Paid
      });

      // Audit Log
      if (userId) {
        await this.auditLogService.createLog({
          acao: 'DESCONCILIACAO',
          tabela: 'conciliacoes_bancarias',
          registroId: link.lancamentoFinanceiroId,
          motivo: `Desconciliação manual da conciliação ${conciliacaoId}`,
          usuarioId: userId,
          valorAntigo: 'CONCILIADO',
          valorNovo: 'REALIZADO',
        });
      }

      return { success: true };
    });
  }
  async findAutoSuggestions(statementIds: string[]) {
    if (!statementIds.length) return [];

    const statements = await this.prisma.extratoBancario.findMany({
      where: { id: { in: statementIds }, conciliado: false },
      select: {
        id: true,
        descricao: true,
        valor: true,
        data: true,
        tipo: true,
      },
    });

    const results: Array<{
      statementId: string;
      statementDesc: string;
      matches: Array<{
        id: string;
        descricao: string;
        valor: number;
        dataVencimento: Date;
      }>;
    }> = [];

    for (const s of statements) {
      const marginDays = 7;
      const startDate = new Date(s.data);
      startDate.setDate(startDate.getDate() - marginDays);
      const endDate = new Date(s.data);
      endDate.setDate(endDate.getDate() + marginDays);

      const expectedType = s.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';

      const matches = await this.prisma.lancamentoFinanceiro.findMany({
        where: {
          valor: Number(s.valor),
          tipo: expectedType,
          dataVencimento: { gte: startDate, lte: endDate },
          status: { not: 'CANCELADO' },
          conciliacoes: { none: {} },
        },
        select: {
          id: true,
          descricao: true,
          valor: true,
          dataVencimento: true,
        },
        take: 3,
      });

      if (matches.length > 0) {
        results.push({
          statementId: s.id,
          statementDesc: s.descricao,
          matches: matches.map((m) => ({
            ...m,
            valor: Number(m.valor),
          })),
        });
      }
    }

    return results;
  }
}
