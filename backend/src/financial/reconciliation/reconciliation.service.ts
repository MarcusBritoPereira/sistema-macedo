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

const lancamentoDetailInclude = {
  categoria: true,
  centroCusto: true,
  cliente: true,
  contrato: true,
  fornecedor: true,
  obra: true,
  recebimentos: {
    orderBy: { dataRecebimento: 'asc' as const },
  },
  rateios: {
    include: {
      categoriaFinanceira: true,
      obra: true,
      centroCusto: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
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
    const page = Math.max(Number(filters?.page) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(filters?.pageSize) || 50, 1),
      200,
    );
    const skip = (page - 1) * pageSize;

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

    const baseAggregateWhere = { ...where };
    delete baseAggregateWhere.conciliado;

    const pendingAggWhere = { ...baseAggregateWhere, conciliado: false };
    const conciliatedAggWhere = { ...baseAggregateWhere, conciliado: true };

    const [total, statements, pendingAgg, conciliatedAgg] =
      await this.prisma.$transaction([
        this.prisma.extratoBancario.count({ where }),
        this.prisma.extratoBancario.findMany({
          where,
          include: {
            conciliacoes: {
              include: {
                lancamentoFinanceiro: {
                  include: lancamentoDetailInclude,
                },
              },
            },
            importacao: true,
          },
          orderBy: [{ data: 'desc' }, { id: 'desc' }],
          skip,
          take: pageSize,
        }),
        this.prisma.extratoBancario.aggregate({
          _sum: { valor: true },
          where: pendingAggWhere,
        }),
        this.prisma.extratoBancario.aggregate({
          _sum: { valor: true },
          where: conciliatedAggWhere,
        }),
      ]);

    const totalPendingValue = Math.abs(Number(pendingAgg._sum.valor || 0));
    const totalConciliatedValue = Math.abs(
      Number(conciliatedAgg._sum.valor || 0),
    );
    const totalPeriodValue = totalPendingValue + totalConciliatedValue;

    const statementsNeedingSuggestion = statements.filter(
      (statement) => !statement.conciliado,
    );
    const hasCreditStatements = statementsNeedingSuggestion.some(
      (statement) => statement.tipo === 'CREDIT',
    );
    const hasDebitStatements = statementsNeedingSuggestion.some(
      (statement) => statement.tipo === 'DEBIT',
    );

    const [clients, suppliers, pastReconciledStatements] =
      await this.prisma.$transaction([
        hasCreditStatements
          ? this.prisma.cliente.findMany({
              where: { ativo: true },
              select: {
                id: true,
                nomeFantasia: true,
                razaoSocial: true,
                cnpj: true,
                cpf: true,
              },
            })
          : this.prisma.cliente.findMany({ where: { id: { in: [] } } }),
        hasDebitStatements
          ? this.prisma.fornecedor.findMany({
              where: { ativo: true },
              select: {
                id: true,
                nomeFantasia: true,
                razaoSocial: true,
                cnpj: true,
              },
            })
          : this.prisma.fornecedor.findMany({ where: { id: { in: [] } } }),
        statementsNeedingSuggestion.length > 0
          ? this.prisma.extratoBancario.findMany({
              where: {
                descricao: {
                  in: [
                    ...new Set(
                      statementsNeedingSuggestion.map(
                        (statement) => statement.descricao,
                      ),
                    ),
                  ],
                },
                conciliado: true,
                conciliacoes: { some: {} },
              },
              include: {
                conciliacoes: {
                  include: {
                    lancamentoFinanceiro: {
                      include: lancamentoDetailInclude,
                    },
                  },
                },
              },
              orderBy: { data: 'desc' },
            })
          : this.prisma.extratoBancario.findMany({ where: { id: { in: [] } } }),
      ]);

    const pastByDescription = new Map<string, any>();
    for (const past of pastReconciledStatements) {
      if (!pastByDescription.has(past.descricao)) {
        pastByDescription.set(past.descricao, past);
      }
    }

    const getSuggestion = (statement: {
      tipo: 'CREDIT' | 'DEBIT';
      descricao: string;
    }): { cliente?: EntitySuggestion; fornecedor?: EntitySuggestion } => {
      if (statement.tipo === 'CREDIT') {
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
        return ranked.length > 0 ? { cliente: ranked[0] } : {};
      }

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
      return ranked.length > 0 ? { fornecedor: ranked[0] } : {};
    };

    const enrichedStatements = statements.map((statement) => {
      const suggestion = getSuggestion({
        tipo: statement.tipo,
        descricao: statement.descricao,
      });

      let learnedSuggestion: any = null;
      if (!statement.conciliado) {
        const linkedLancamento = pastByDescription.get(statement.descricao)
          ?.conciliacoes?.[0]?.lancamentoFinanceiro;
        if (linkedLancamento) {
          learnedSuggestion = {
            categoriaId: linkedLancamento.categoriaId,
            centroCustoId: linkedLancamento.centroCustoId,
            fornecedorId: linkedLancamento.fornecedorId,
            clienteId: linkedLancamento.clienteId,
            tipoLancamento: linkedLancamento.tipoLancamento,
            tipoCusto: linkedLancamento.tipoCusto,
            categoriaCusto: linkedLancamento.categoriaCusto,
            obraId: linkedLancamento.obraId,
          };
        }
      }

      return {
        ...statement,
        suggestedEntity: suggestion,
        learnedSuggestion,
      };
    });

    return {
      data: enrichedStatements,
      summary: {
        totalPendingValue,
        totalConciliatedValue,
        totalPeriodValue,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
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

  async getOpenReceivables(filters?: {
    clienteId?: string;
    search?: string;
  }) {
    const where: any = {
      tipo: 'RECEITA',
      status: {
        in: ['PREVISTO', 'PARCIAL'],
      },
    };

    if (filters?.clienteId) {
      where.clienteId = filters.clienteId;
    }

    if (filters?.search) {
      where.OR = [
        {
          descricao: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          cliente: {
            razaoSocial: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          cliente: {
            nomeFantasia: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          contrato: {
            descricao: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where,
      include: {
        cliente: true,
        contrato: true,
        categoria: true,
        recebimentos: {
          orderBy: {
            dataRecebimento: 'asc',
          },
        },
      },
      orderBy: [
        {
          dataVencimento: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
      take: 500,
    });

    return lancamentos
      .map((lancamento) => {
        const valorOriginal = Number(lancamento.valor);

        const valorRecebido = lancamento.recebimentos.reduce(
          (total, recebimento) => total + Number(recebimento.valor),
          0,
        );

        const saldoReceber = Math.max(
          0,
          Number((valorOriginal - valorRecebido).toFixed(2)),
        );

        return {
          ...lancamento,
          valorOriginal,
          valorRecebido: Number(valorRecebido.toFixed(2)),
          saldoReceber,
        };
      })
      .filter((lancamento) => lancamento.saldoReceber > 0.009);
  }

  async getOpenPayables(filters?: {
    fornecedorId?: string;
    search?: string;
  }) {
    const where: any = {
      tipo: 'DESPESA',
      status: {
        in: ['PREVISTO', 'PARCIAL'],
      },
    };

    if (filters?.fornecedorId) {
      where.fornecedorId = filters.fornecedorId;
    }

    if (filters?.search) {
      where.OR = [
        {
          descricao: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          fornecedor: {
            razaoSocial: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          fornecedor: {
            nomeFantasia: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where,
      include: {
        fornecedor: true,
        categoria: true,
        recebimentos: {
          orderBy: {
            dataRecebimento: 'asc',
          },
        },
      },
      orderBy: [
        {
          dataVencimento: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
      take: 500,
    });

    return lancamentos
      .map((lancamento) => {
        const valorOriginal = Number(lancamento.valor);

        const valorRecebido = lancamento.recebimentos.reduce(
          (total, recebimento) => total + Number(recebimento.valor),
          0,
        );

        const saldoReceber = Math.max(
          0,
          Number((valorOriginal - valorRecebido).toFixed(2)),
        );

        return {
          ...lancamento,
          valorOriginal,
          valorRecebido: Number(valorRecebido.toFixed(2)),
          saldoReceber,
        };
      })
      .filter((lancamento) => lancamento.saldoReceber > 0.009);
  }

  private async recalculateReceivableStatus(
    tx: any,
    lancamentoId: string,
  ) {
    const lancamento = await tx.lancamentoFinanceiro.findUnique({
      where: {
        id: lancamentoId,
      },
      include: {
        recebimentos: {
          orderBy: {
            dataRecebimento: 'desc',
          },
        },
      },
    });

    if (!lancamento) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const valorOriginal = Number(lancamento.valor);

    const valorRecebido = lancamento.recebimentos.reduce(
      (total: number, recebimento: any) =>
        total + Number(recebimento.valor),
      0,
    );

    const saldoReceber = Number(
      Math.max(0, valorOriginal - valorRecebido).toFixed(2),
    );

    let status: StatusLancamento = 'PREVISTO';
    let dataPagamento: Date | null = null;

    if (valorRecebido >= valorOriginal - 0.009) {
      status = 'CONCILIADO';
      dataPagamento =
        lancamento.recebimentos[0]?.dataRecebimento || new Date();
    } else if (valorRecebido > 0.009) {
      status = 'PARCIAL';
    }

    await tx.lancamentoFinanceiro.update({
      where: {
        id: lancamentoId,
      },
      data: {
        status,
        dataPagamento,
      },
    });

    return {
      valorOriginal,
      valorRecebido: Number(valorRecebido.toFixed(2)),
      saldoReceber,
      status,
      dataPagamento,
    };
  }

  async linkReceivablePayment(
    statementId: string,
    lancamentoId: string,
    confirmacaoManual?: boolean,
    userId?: string,
  ) {
    if (!confirmacaoManual) {
      throw new BadRequestException(
        'Confirmação manual obrigatória para conciliar',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const statement = await tx.extratoBancario.findUnique({
        where: {
          id: statementId,
        },
      });

      if (!statement) {
        throw new NotFoundException('Extrato não encontrado');
      }

      if (statement.conciliado) {
        throw new BadRequestException('Extrato já conciliado');
      }

      if (statement.tipo !== 'CREDIT') {
        throw new BadRequestException(
          'Somente créditos bancários podem ser vinculados a contas a receber',
        );
      }

      const lancamento = await tx.lancamentoFinanceiro.findUnique({
        where: {
          id: lancamentoId,
        },
        include: {
          cliente: true,
          contrato: true,
          recebimentos: true,
        },
      });

      if (!lancamento) {
        throw new NotFoundException('Conta a receber não encontrada');
      }

      if (lancamento.tipo !== 'RECEITA') {
        throw new BadRequestException(
          'O lançamento selecionado não é uma conta a receber',
        );
      }

      if (lancamento.status === 'CANCELADO') {
        throw new BadRequestException(
          'Não é possível receber uma parcela cancelada',
        );
      }

      const valorOriginal = Number(lancamento.valor);

      const valorJaRecebido = lancamento.recebimentos.reduce(
        (total, recebimento) => total + Number(recebimento.valor),
        0,
      );

      const saldoAtual = Number(
        Math.max(0, valorOriginal - valorJaRecebido).toFixed(2),
      );

      if (saldoAtual <= 0.009) {
        throw new BadRequestException(
          'Esta conta a receber já está integralmente recebida',
        );
      }

      const valorPagamento = Math.abs(Number(statement.valor));

      if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
        throw new BadRequestException(
          'O valor do crédito bancário é inválido',
        );
      }

      if (valorPagamento > saldoAtual + 0.009) {
        throw new BadRequestException(
          `O crédito de R$ ${valorPagamento.toFixed(
            2,
          )} é maior que o saldo da parcela de R$ ${saldoAtual.toFixed(2)}.`,
        );
      }

      const conciliacao = await tx.conciliacaoBancaria.create({
        data: {
          extratoBancarioId: statementId,
          lancamentoFinanceiroId: lancamentoId,
          type: 'MANUAL_LINK',
        },
      });

      await tx.recebimentoLancamento.create({
        data: {
          lancamentoFinanceiroId: lancamentoId,
          extratoBancarioId: statementId,
          conciliacaoBancariaId: conciliacao.id,
          valor: valorPagamento,
          dataRecebimento: statement.data,
          observacao: `Recebimento vinculado ao extrato: ${statement.descricao}`,
        },
      });

      await tx.extratoBancario.update({
        where: {
          id: statementId,
        },
        data: {
          conciliado: true,
        },
      });

      const resultado = await this.recalculateReceivableStatus(
        tx,
        lancamentoId,
      );

      if (userId) {
        await tx.logAuditoria.create({
          data: {
            acao: 'RECEBIMENTO_CONTA_RECEBER',
            tabela: 'recebimentos_lancamentos',
            registroId: conciliacao.id,
            motivo: `Recebimento da conta a receber pelo extrato ${statementId}`,
            usuarioId: userId,
            valorAntigo: JSON.stringify({
              valorOriginal,
              valorRecebido: valorJaRecebido,
              saldoReceber: saldoAtual,
            }),
            valorNovo: JSON.stringify(resultado),
          },
        });
      }

      return {
        success: true,
        conciliacaoId: conciliacao.id,
        lancamentoId,
        valorPagamento,
        ...resultado,
      };
    });
  }

  async linkPayablePayment(
    statementId: string,
    lancamentoId: string,
    confirmacaoManual?: boolean,
    userId?: string,
  ) {
    if (!confirmacaoManual) {
      throw new BadRequestException(
        'Confirmação manual obrigatória para conciliar',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const statement = await tx.extratoBancario.findUnique({
        where: {
          id: statementId,
        },
      });

      if (!statement) {
        throw new NotFoundException('Extrato não encontrado');
      }

      if (statement.conciliado) {
        throw new BadRequestException('Extrato já conciliado');
      }

      if (statement.tipo !== 'DEBIT') {
        throw new BadRequestException(
          'Somente débitos bancários podem ser vinculados a contas a pagar',
        );
      }

      const lancamento = await tx.lancamentoFinanceiro.findUnique({
        where: {
          id: lancamentoId,
        },
        include: {
          fornecedor: true,
          recebimentos: true,
        },
      });

      if (!lancamento) {
        throw new NotFoundException('Conta a pagar não encontrada');
      }

      if (lancamento.tipo !== 'DESPESA') {
        throw new BadRequestException(
          'O lançamento selecionado não é uma conta a pagar',
        );
      }

      if (lancamento.status === 'CANCELADO') {
        throw new BadRequestException(
          'Não é possível pagar uma parcela cancelada',
        );
      }

      const valorOriginal = Number(lancamento.valor);

      const valorJaPago = lancamento.recebimentos.reduce(
        (total, recebimento) => total + Number(recebimento.valor),
        0,
      );

      const saldoAtual = Number(
        Math.max(0, valorOriginal - valorJaPago).toFixed(2),
      );

      if (saldoAtual <= 0.009) {
        throw new BadRequestException(
          'Esta conta a pagar já está integralmente paga',
        );
      }

      const valorPagamento = Math.abs(Number(statement.valor));

      if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
        throw new BadRequestException(
          'O valor do débito bancário é inválido',
        );
      }

      if (valorPagamento > saldoAtual + 0.009) {
        throw new BadRequestException(
          `O débito de R$ ${valorPagamento.toFixed(
            2,
          )} é maior que o saldo da parcela de R$ ${saldoAtual.toFixed(2)}.`,
        );
      }

      const conciliacao = await tx.conciliacaoBancaria.create({
        data: {
          extratoBancarioId: statementId,
          lancamentoFinanceiroId: lancamentoId,
          type: 'MANUAL_LINK',
        },
      });

      await tx.recebimentoLancamento.create({
        data: {
          lancamentoFinanceiroId: lancamentoId,
          extratoBancarioId: statementId,
          conciliacaoBancariaId: conciliacao.id,
          valor: valorPagamento,
          dataRecebimento: statement.data,
          observacao: `Pagamento vinculado ao extrato: ${statement.descricao}`,
        },
      });

      await tx.extratoBancario.update({
        where: {
          id: statementId,
        },
        data: {
          conciliado: true,
        },
      });

      const resultado = await this.recalculateReceivableStatus(
        tx,
        lancamentoId,
      );

      if (userId) {
        await tx.logAuditoria.create({
          data: {
            acao: 'PAGAMENTO_CONTA_PAGAR',
            tabela: 'recebimentos_lancamentos',
            registroId: conciliacao.id,
            motivo: `Pagamento da conta a pagar pelo extrato ${statementId}`,
            usuarioId: userId,
            valorAntigo: JSON.stringify({
              valorOriginal,
              valorPago: valorJaPago,
              saldoPagar: saldoAtual,
            }),
            valorNovo: JSON.stringify(resultado),
          },
        });
      }

      return {
        success: true,
        conciliacaoId: conciliacao.id,
        lancamentoId,
        valorPagamento,
        ...resultado,
      };
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
      const obraId = sanitize(data.obraId);
      const observacoes = data.observacoes || null;
      const competenciaDate = dataCompetencia
        ? new Date(dataCompetencia)
        : statement.data;
      const isTransfer =
        data?.isTransfer === true || data?.isTransfer === 'true';
      const contaDestinoId = sanitize(data.contaDestinoId);

      const tipoLancamento = sanitize(data.tipoLancamento);
      const tipoCusto = sanitize(data.tipoCusto);
      const categoriaCusto = sanitize(data.categoriaCusto);
      const rateios = Array.isArray(data.rateios) ? data.rateios : [];
      const normalizedRateios = rateios.map((rateio: any, index: number) => ({
        valor: Number(rateio.valor),
        categoria: sanitize(rateio.categoria) || 'OUTROS',
        subcategoria: sanitize(rateio.subcategoria),
        categoriaFinanceiraId: sanitize(rateio.categoriaFinanceiraId),
        obraId: sanitize(rateio.obraId),
        centroCustoId: sanitize(rateio.centroCustoId),
        tipoDestino: sanitize(rateio.tipoDestino) || 'CENTRO_CUSTO',
        tipoCusto: sanitize(rateio.tipoCusto),
        categoriaCusto: sanitize(rateio.categoriaCusto),
        descricaoItem: sanitize(rateio.descricaoItem),
        quantidade: rateio.quantidade ? Number(rateio.quantidade) : null,
        valorUnitario: rateio.valorUnitario
          ? Number(rateio.valorUnitario)
          : null,
        recorrente: Boolean(rateio.recorrente),
        observacao: sanitize(rateio.observacao),
        index,
      }));

      if (!isTransfer && normalizedRateios.length > 0) {
        const invalid = normalizedRateios
          .map((rateio: any) => {
            const camposAusentes: string[] = [];

            if (!Number.isFinite(rateio.valor) || rateio.valor <= 0) {
              camposAusentes.push('valor');
            }

            if (!rateio.categoriaFinanceiraId) {
              camposAusentes.push('categoria financeira');
            }

            if (
              (rateio.tipoDestino === 'OBRA' ||
                rateio.tipoDestino === 'POS_OBRA') &&
              !rateio.obraId
            ) {
              camposAusentes.push('obra');
            }

            if (
              rateio.tipoDestino === 'CENTRO_CUSTO' &&
              !rateio.centroCustoId
            ) {
              camposAusentes.push('centro de custo');
            }

            if (
              rateio.tipoCusto === 'MATERIAL' &&
              !rateio.categoriaCusto
            ) {
              camposAusentes.push('material/insumo');
            }

            return {
              ...rateio,
              camposAusentes,
            };
          })
          .find((rateio: any) => rateio.camposAusentes.length > 0);

        if (invalid) {
          console.error(
            '[RATEIO INVÁLIDO]',
            JSON.stringify({
              numero: invalid.index + 1,
              tipoDestino: invalid.tipoDestino,
              tipoCusto: invalid.tipoCusto,
              valor: invalid.valor,
              obraId: invalid.obraId,
              centroCustoId: invalid.centroCustoId,
              categoriaFinanceiraId: invalid.categoriaFinanceiraId,
              categoriaCusto: invalid.categoriaCusto,
              camposAusentes: invalid.camposAusentes,
            }),
          );

          throw new BadRequestException(
            `Rateio ${invalid.index + 1} incompleto. Verifique: ${invalid.camposAusentes.join(', ')}.`,
          );
        }

        const totalRateado = normalizedRateios.reduce(
          (total: number, rateio: any) => total + rateio.valor,
          0,
        );
        const valorExtrato = Math.abs(Number(statement.valor));
        if (Math.abs(totalRateado - valorExtrato) > 0.01) {
          throw new BadRequestException(
            `A soma dos rateios (R$ ${totalRateado.toFixed(2)}) deve ser igual ao valor do extrato (R$ ${valorExtrato.toFixed(2)}).`,
          );
        }

        const obraIds = [
          ...new Set(
            normalizedRateios.map((r: any) => r.obraId).filter(Boolean),
          ),
        ] as string[];
        const centroCustoIds = [
          ...new Set(
            normalizedRateios.map((r: any) => r.centroCustoId).filter(Boolean),
          ),
        ] as string[];
        const categoriaIds = [
          ...new Set(
            normalizedRateios.map((r: any) => r.categoriaFinanceiraId),
          ),
        ] as string[];
        const [obrasValidas, centrosValidos, categoriasValidas] =
          await Promise.all([
            tx.obra.count({ where: { id: { in: obraIds }, ativo: true } }),
            tx.centroCusto.count({
              where: {
                id: { in: centroCustoIds },
                ativo: true,
                aceitaLancamento: true,
              },
            }),
            tx.categoriaFinanceira.count({
              where: { id: { in: categoriaIds } },
            }),
          ]);
        if (
          obrasValidas !== obraIds.length ||
          centrosValidos !== centroCustoIds.length ||
          categoriasValidas !== categoriaIds.length
        ) {
          throw new BadRequestException(
            'Um dos destinos ou categorias do rateio é inválido ou está inativo.',
          );
        }
      }

      if (
        !isTransfer &&
        statement.tipo !== 'CREDIT' &&
        !fornecedorId
      ) {
        throw new BadRequestException(
          'Fornecedor é obrigatório para conciliar um pagamento.',
        );
      }

      if (
        !isTransfer &&
        statement.tipo === 'CREDIT' &&
        !clienteId
      ) {
        const suggestion = await this.suggestEntityForStatement({
          tipo: statement.tipo,
          descricao: data.descricao || statement.descricao,
        });

        clienteId = suggestion.cliente?.id || null;
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
            categoriaId:
              normalizedRateios.length === 1
                ? normalizedRateios[0].categoriaFinanceiraId
                : categoriaId,
            centroCustoId:
              normalizedRateios.length === 1
                ? normalizedRateios[0].centroCustoId
                : normalizedRateios.length > 1
                  ? null
                  : centroCustoId,
            clienteId: clienteId,
            fornecedorId: fornecedorId,
            obraId:
              normalizedRateios.length === 1
                ? normalizedRateios[0].obraId
                : normalizedRateios.length > 1
                  ? null
                  : obraId,
            tipoLancamento: tipoLancamento,
            tipoCusto: tipoCusto,
            categoriaCusto: categoriaCusto,
            observacoes:
              observacoes ||
              `Criado via conciliação bancária: ${statement.descricao}`,
          },
        });

        if (normalizedRateios.length > 0) {
          await tx.rateioLancamento.createMany({
            data: normalizedRateios.map(({ index, ...rateio }: any) => ({
              ...rateio,
              lancamentoId: lancamento.id,
              updatedBy: userId,
            })),
          });
        }

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
        where: {
          id: conciliacaoId,
        },
        include: {
          recebimento: true,
          lancamentoFinanceiro: true,
        },
      });

      if (!link) {
        throw new NotFoundException('Conciliação não encontrada');
      }

      const eraRecebimentoContaReceber = Boolean(link.recebimento);

      await tx.conciliacaoBancaria.delete({
        where: {
          id: conciliacaoId,
        },
      });

      await tx.extratoBancario.update({
        where: {
          id: link.extratoBancarioId,
        },
        data: {
          conciliado: false,
        },
      });

      let valorNovo = 'REALIZADO';

      if (eraRecebimentoContaReceber) {
        const resultado = await this.recalculateReceivableStatus(
          tx,
          link.lancamentoFinanceiroId,
        );

        valorNovo = resultado.status;
      } else {
        await tx.lancamentoFinanceiro.update({
          where: {
            id: link.lancamentoFinanceiroId,
          },
          data: {
            status: 'REALIZADO',
          },
        });
      }

      if (userId) {
        await tx.logAuditoria.create({
          data: {
            acao: 'DESCONCILIACAO',
            tabela: 'conciliacoes_bancarias',
            registroId: link.lancamentoFinanceiroId,
            motivo: `Desconciliação manual da conciliação ${conciliacaoId}`,
            usuarioId: userId,
            valorAntigo: link.lancamentoFinanceiro.status,
            valorNovo,
          },
        });
      }

      return {
        success: true,
        statusLancamento: valorNovo,
      };
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

  async zeroPendingStatements(
    contaBancariaId: string,
    year: number,
    month: number,
    userId?: string,
  ) {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const result = await this.prisma.$transaction(async (tx) => {
      const pendingStatements = await tx.extratoBancario.findMany({
        where: {
          importacao: { contaBancariaId },
          conciliado: false,
          data: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      if (pendingStatements.length === 0) {
        return { success: true, count: 0 };
      }

      const ids = pendingStatements.map((s) => s.id);

      await tx.extratoBancario.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          conciliado: true,
        },
      });

      // Audit log
      if (userId) {
        await this.auditLogService.createLog({
          acao: 'CONCILIACAO_MANUAL',
          tabela: 'extratos_bancarios',
          registroId: contaBancariaId,
          motivo: `Zerou ${ids.length} lançamentos pendentes em lote para o mês ${month}/${year}`,
          usuarioId: userId,
          valorAntigo: 'PENDENTE',
          valorNovo: 'CONCILIADO',
        });
      }

      return { success: true, count: ids.length };
    });

    return result;
  }

  async createManualStatement(
    contaBancariaId: string,
    dataStr: string,
    descricao: string,
    valor: number,
    tipo: 'CREDIT' | 'DEBIT',
  ) {
    const data = new Date(dataStr);
    
    // We need an importacao for the ExtratoBancario. 
    // We will find or create a manual one for this account.
    let importacao = await this.prisma.importacaoBancaria.findFirst({
      where: {
        contaBancariaId,
        fileType: 'MANUAL',
      },
    });

    if (!importacao) {
      importacao = await this.prisma.importacaoBancaria.create({
        data: {
          contaBancariaId,
          filename: 'Lançamentos Manuais',
          fileType: 'MANUAL',
          status: 'COMPLETED',
        },
      });
    }

    const { v4: uuidv4 } = require('uuid');

    const extrato = await this.prisma.extratoBancario.create({
      data: {
        importacaoId: importacao.id,
        data,
        descricao,
        valor,
        tipo,
        sourceType: 'MANUAL',
        hash: `manual-${uuidv4()}`,
        conciliado: false,
      },
    });

    return extrato;
  }
}
