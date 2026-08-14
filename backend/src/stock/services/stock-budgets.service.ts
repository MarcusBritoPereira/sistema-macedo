import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusOrcamentoMaterialObra } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockBudgetDto } from '../dto/create-stock-budget.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { normalizePagination, stringifyAudit } from './stock-common';
import { StockCostingService } from './stock-costing.service';

@Injectable()
export class StockBudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costing: StockCostingService,
  ) {}

  async create(dto: CreateStockBudgetDto, userId: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { id: dto.obraId },
    });
    if (!obra || !obra.ativo)
      throw new NotFoundException('Obra ativa não encontrada');

    const versao = dto.versao ?? (await this.nextVersion(dto.obraId));
    const existing = await this.prisma.orcamentoMaterialObra.findUnique({
      where: { obraId_versao: { obraId: dto.obraId, versao } },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        'Já existe orçamento de materiais para esta obra e versão',
      );

    const items = await Promise.all(
      dto.items.map(async (item) => {
        const material = await this.prisma.material.findUnique({
          where: { id: item.materialId },
        });
        if (!material || !material.ativo)
          throw new NotFoundException('Material ativo não encontrado');
        const quantity = this.costing.assertPositive(
          item.quantidadeOrcada,
          'quantidadeOrcada',
        );
        const unitCost = this.costing.assertNonNegative(
          item.custoUnitarioOrcado,
          'custoUnitarioOrcado',
        );
        return {
          materialId: item.materialId,
          categoriaMaterialId:
            item.categoriaMaterialId || material.categoriaMaterialId,
          quantidadeOrcada: quantity,
          custoUnitarioOrcado: unitCost,
          custoTotalOrcado: quantity.mul(unitCost),
          etapaObra: item.etapaObra?.trim() || null,
          centroCustoId: item.centroCustoId || null,
          observacao: item.observacao?.trim() || null,
        };
      }),
    );

    const budget = await this.prisma.orcamentoMaterialObra.create({
      data: {
        obraId: dto.obraId,
        versao,
        dataReferencia: new Date(dto.dataReferencia),
        observacao: dto.observacao?.trim() || null,
        criadoPorId: userId,
        itens: { create: items },
      },
      include: this.includeRelations(),
    });
    await this.audit(
      userId,
      'ESTOQUE_ORCAMENTO_MATERIAL_CRIADO',
      budget.id,
      null,
      budget,
    );
    return budget;
  }

  async findAll(
    query: PaginationQueryDto & {
      status?: StatusOrcamentoMaterialObra;
      obraId?: string;
    },
  ) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.OrcamentoMaterialObraWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.obraId ? { obraId: query.obraId } : {}),
      ...(query.search
        ? {
            OR: [
              { observacao: { contains: query.search, mode: 'insensitive' } },
              {
                obra: { nome: { contains: query.search, mode: 'insensitive' } },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.orcamentoMaterialObra.findMany({
        where,
        skip,
        take,
        include: {
          obra: true,
          criadoPor: true,
          aprovadoPor: true,
          _count: { select: { itens: true } },
        },
        orderBy: [{ obra: { nome: 'asc' } }, { versao: 'desc' }],
      }),
      this.prisma.orcamentoMaterialObra.count({ where }),
    ]);
    const budgetTotals = items.length
      ? await this.prisma.itemOrcamentoMaterialObra.groupBy({
          by: ['orcamentoId'],
          where: {
            orcamentoId: {
              in: items.map((item) => item.id),
            },
          },
          _sum: {
            custoTotalOrcado: true,
          },
        })
      : [];

    const totalByBudget = new Map(
      budgetTotals.map((item) => [
        item.orcamentoId,
        item._sum.custoTotalOrcado?.toString() || '0',
      ]),
    );

    return {
      items: items.map((item) => ({
        ...item,
        valorTotalOrcado: totalByBudget.get(item.id) || '0',
      })),
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const budget = await this.prisma.orcamentoMaterialObra.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!budget)
      throw new NotFoundException('Orçamento de materiais não encontrado');
    return budget;
  }

  async submit(id: string, userId: string) {
    const before = await this.findOne(id);

    if (before.status !== StatusOrcamentoMaterialObra.RASCUNHO) {
      throw new BadRequestException(
        'Somente orçamento em rascunho pode ser enviado para aprovação',
      );
    }

    const updated = await this.prisma.orcamentoMaterialObra.update({
      where: { id },
      data: {
        status: StatusOrcamentoMaterialObra.PENDENTE_APROVACAO,
      },
      include: this.includeRelations(),
    });

    await this.audit(
      userId,
      'ESTOQUE_ORCAMENTO_MATERIAL_ENVIADO_APROVACAO',
      id,
      before,
      updated,
    );

    return updated;
  }

  async approve(id: string, userId: string) {
    const before = await this.findOne(id);

    if (before.status !== StatusOrcamentoMaterialObra.PENDENTE_APROVACAO) {
      throw new BadRequestException(
        'Orçamento deve estar pendente de aprovação',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const previousApproved = await tx.orcamentoMaterialObra.findMany({
        where: {
          obraId: before.obraId,
          status: StatusOrcamentoMaterialObra.APROVADO,
          NOT: {
            id,
          },
        },
        include: this.includeRelations(),
      });

      if (previousApproved.length) {
        await tx.orcamentoMaterialObra.updateMany({
          where: {
            id: {
              in: previousApproved.map((item) => item.id),
            },
          },
          data: {
            status: StatusOrcamentoMaterialObra.SUBSTITUIDO,
          },
        });
      }

      const updated = await tx.orcamentoMaterialObra.update({
        where: { id },
        data: {
          status: StatusOrcamentoMaterialObra.APROVADO,
          aprovadoPorId: userId,
        },
        include: this.includeRelations(),
      });

      return {
        previousApproved,
        updated,
      };
    });

    for (const previous of result.previousApproved) {
      await this.audit(
        userId,
        'ESTOQUE_ORCAMENTO_MATERIAL_SUBSTITUIDO',
        previous.id,
        previous,
        {
          ...previous,
          status: StatusOrcamentoMaterialObra.SUBSTITUIDO,
        },
      );
    }

    await this.audit(
      userId,
      'ESTOQUE_ORCAMENTO_MATERIAL_APROVADO',
      id,
      before,
      result.updated,
    );

    return result.updated;
  }

  async cancel(id: string, userId: string) {
    const before = await this.findOne(id);

    if (
      before.status !== StatusOrcamentoMaterialObra.RASCUNHO &&
      before.status !== StatusOrcamentoMaterialObra.PENDENTE_APROVACAO
    ) {
      throw new BadRequestException(
        'Somente orçamento em rascunho ou pendente pode ser cancelado',
      );
    }

    const updated = await this.prisma.orcamentoMaterialObra.update({
      where: { id },
      data: {
        status: StatusOrcamentoMaterialObra.CANCELADO,
      },
      include: this.includeRelations(),
    });

    await this.audit(
      userId,
      'ESTOQUE_ORCAMENTO_MATERIAL_CANCELADO',
      id,
      before,
      updated,
    );

    return updated;
  }

  async actualVsBudget(id: string) {
    const budget = await this.findOne(id);

    const appropriations = await this.prisma.apropriacaoCustoEstoque.groupBy({
      by: ['materialId'],
      where: {
        obraId: budget.obraId,
      },
      _sum: {
        quantidade: true,
        custoTotal: true,
      },
    });

    const actualByMaterial = new Map(
      appropriations.map((item) => [item.materialId, item]),
    );

    const budgetByMaterial = new Map<
      string,
      {
        first: (typeof budget.itens)[number];
        quantidade: Prisma.Decimal;
        custo: Prisma.Decimal;
        etapas: Set<string>;
        centros: Set<string>;
      }
    >();

    for (const item of budget.itens) {
      const existing = budgetByMaterial.get(item.materialId);

      if (existing) {
        existing.quantidade = existing.quantidade.plus(item.quantidadeOrcada);

        existing.custo = existing.custo.plus(item.custoTotalOrcado);

        if (item.etapaObra) {
          existing.etapas.add(item.etapaObra);
        }

        if (item.centroCusto?.nome) {
          existing.centros.add(item.centroCusto.nome);
        }

        continue;
      }

      budgetByMaterial.set(item.materialId, {
        first: item,
        quantidade: new Prisma.Decimal(item.quantidadeOrcada),
        custo: new Prisma.Decimal(item.custoTotalOrcado),
        etapas: new Set(item.etapaObra ? [item.etapaObra] : []),
        centros: new Set(item.centroCusto?.nome ? [item.centroCusto.nome] : []),
      });
    }

    const items = Array.from(budgetByMaterial.entries()).map(
      ([materialId, grouped]) => {
        const actual = actualByMaterial.get(materialId);

        const quantidadeOrcada = grouped.quantidade;

        const custoTotalOrcado = grouped.custo;

        const quantidadeConsumida =
          actual?._sum.quantidade ?? new Prisma.Decimal(0);

        const custoReal = actual?._sum.custoTotal ?? new Prisma.Decimal(0);

        const diferencaQuantidade = quantidadeConsumida.minus(quantidadeOrcada);

        const desvioCusto = custoReal.minus(custoTotalOrcado);

        const percentualQuantidade = quantidadeOrcada.gt(0)
          ? quantidadeConsumida.div(quantidadeOrcada).mul(100)
          : new Prisma.Decimal(0);

        const percentualCusto = custoTotalOrcado.gt(0)
          ? custoReal.div(custoTotalOrcado).mul(100)
          : new Prisma.Decimal(0);

        const first = grouped.first;

        return {
          materialId,
          codigo: first.material.codigo,
          material: first.material.nome,

          categoria:
            first.categoriaMaterial?.nome ||
            first.material.categoriaMaterial?.nome ||
            null,

          etapaObra: grouped.etapas.size
            ? Array.from(grouped.etapas).join(', ')
            : null,

          centroCusto: grouped.centros.size
            ? Array.from(grouped.centros).join(', ')
            : null,

          quantidadeOrcada: quantidadeOrcada.toString(),

          quantidadeConsumida: quantidadeConsumida.toString(),

          diferencaQuantidade: diferencaQuantidade.toString(),

          percentualQuantidade: percentualQuantidade.toFixed(2),

          custoOrcado: custoTotalOrcado.toString(),

          custoReal: custoReal.toString(),

          desvioCusto: desvioCusto.toString(),

          percentualCusto: percentualCusto.toFixed(2),

          situacao:
            desvioCusto.gt(0) || diferencaQuantidade.gt(0) ? 'ACIMA' : 'DENTRO',
        };
      },
    );

    const totals = items.reduce(
      (acc, item) => ({
        quantidadeOrcada: acc.quantidadeOrcada.plus(item.quantidadeOrcada),

        quantidadeConsumida: acc.quantidadeConsumida.plus(
          item.quantidadeConsumida,
        ),

        custoOrcado: acc.custoOrcado.plus(item.custoOrcado),

        custoReal: acc.custoReal.plus(item.custoReal),
      }),
      {
        quantidadeOrcada: new Prisma.Decimal(0),

        quantidadeConsumida: new Prisma.Decimal(0),

        custoOrcado: new Prisma.Decimal(0),

        custoReal: new Prisma.Decimal(0),
      },
    );

    return {
      budget: {
        id: budget.id,
        obra: budget.obra,
        versao: budget.versao,
        status: budget.status,
        dataReferencia: budget.dataReferencia,
      },

      totals: {
        quantidadeOrcada: totals.quantidadeOrcada.toString(),

        quantidadeConsumida: totals.quantidadeConsumida.toString(),

        custoOrcado: totals.custoOrcado.toString(),

        custoReal: totals.custoReal.toString(),

        desvioCusto: totals.custoReal.minus(totals.custoOrcado).toString(),
      },

      items,
    };
  }

  private async nextVersion(obraId: string) {
    const latest = await this.prisma.orcamentoMaterialObra.findFirst({
      where: { obraId },
      orderBy: { versao: 'desc' },
      select: { versao: true },
    });
    return (latest?.versao ?? 0) + 1;
  }

  private includeRelations() {
    return {
      obra: true,
      criadoPor: true,
      aprovadoPor: true,
      itens: {
        include: {
          material: { include: { categoriaMaterial: true } },
          categoriaMaterial: true,
          centroCusto: true,
        },
        orderBy: { material: { nome: 'asc' as const } },
      },
    };
  }

  private async audit(
    userId: string,
    action: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.logAuditoria.create({
      data: {
        usuarioId: userId,
        acao: action,
        tabela: 'orcamentos_material_obra',
        registroId: entityId,
        valorAntigo: before ? stringifyAudit(before) : null,
        valorNovo: after ? stringifyAudit(after) : null,
        motivo: 'Operação de orçamento de materiais da obra',
      },
    });
  }
}
