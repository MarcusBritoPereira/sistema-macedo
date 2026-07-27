import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const obra = await this.prisma.obra.findUnique({ where: { id: dto.obraId } });
    if (!obra || !obra.ativo) throw new NotFoundException('Obra ativa não encontrada');

    const versao = dto.versao ?? await this.nextVersion(dto.obraId);
    const existing = await this.prisma.orcamentoMaterialObra.findUnique({
      where: { obraId_versao: { obraId: dto.obraId, versao } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Já existe orçamento de materiais para esta obra e versão');

    const items = await Promise.all(dto.items.map(async (item) => {
      const material = await this.prisma.material.findUnique({ where: { id: item.materialId } });
      if (!material || !material.ativo) throw new NotFoundException('Material ativo não encontrado');
      const quantity = this.costing.assertPositive(item.quantidadeOrcada, 'quantidadeOrcada');
      const unitCost = this.costing.assertNonNegative(item.custoUnitarioOrcado, 'custoUnitarioOrcado');
      return {
        materialId: item.materialId,
        categoriaMaterialId: item.categoriaMaterialId || material.categoriaMaterialId,
        quantidadeOrcada: quantity,
        custoUnitarioOrcado: unitCost,
        custoTotalOrcado: quantity.mul(unitCost),
        etapaObra: item.etapaObra?.trim() || null,
        centroCustoId: item.centroCustoId || null,
        observacao: item.observacao?.trim() || null,
      };
    }));

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
    await this.audit(userId, 'ESTOQUE_ORCAMENTO_MATERIAL_CRIADO', budget.id, null, budget);
    return budget;
  }

  async findAll(query: PaginationQueryDto & { status?: StatusOrcamentoMaterialObra; obraId?: string }) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.OrcamentoMaterialObraWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.obraId ? { obraId: query.obraId } : {}),
      ...(query.search
        ? { OR: [{ observacao: { contains: query.search, mode: 'insensitive' } }, { obra: { nome: { contains: query.search, mode: 'insensitive' } } }] }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.orcamentoMaterialObra.findMany({
        where,
        skip,
        take,
        include: { obra: true, criadoPor: true, aprovadoPor: true, _count: { select: { itens: true } } },
        orderBy: [{ obra: { nome: 'asc' } }, { versao: 'desc' }],
      }),
      this.prisma.orcamentoMaterialObra.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const budget = await this.prisma.orcamentoMaterialObra.findUnique({ where: { id }, include: this.includeRelations() });
    if (!budget) throw new NotFoundException('Orçamento de materiais não encontrado');
    return budget;
  }

  async approve(id: string, userId: string) {
    const before = await this.findOne(id);
    if (![StatusOrcamentoMaterialObra.RASCUNHO, StatusOrcamentoMaterialObra.PENDENTE_APROVACAO].includes(before.status as any)) {
      throw new BadRequestException('Somente orçamento em rascunho ou pendente pode ser aprovado');
    }
    const updated = await this.prisma.orcamentoMaterialObra.update({
      where: { id },
      data: { status: StatusOrcamentoMaterialObra.APROVADO, aprovadoPorId: userId },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_ORCAMENTO_MATERIAL_APROVADO', id, before, updated);
    return updated;
  }

  async actualVsBudget(id: string) {
    const budget = await this.findOne(id);
    const appropriations = await this.prisma.apropriacaoCustoEstoque.groupBy({
      by: ['materialId'],
      where: { obraId: budget.obraId },
      _sum: { quantidade: true, custoTotal: true },
    });
    const actualByMaterial = new Map(appropriations.map((item) => [item.materialId, item]));

    const items = budget.itens.map((item) => {
      const actual = actualByMaterial.get(item.materialId);
      const quantidadeOrcada = new Prisma.Decimal(item.quantidadeOrcada);
      const custoTotalOrcado = new Prisma.Decimal(item.custoTotalOrcado);
      const quantidadeConsumida = actual?._sum.quantidade ?? new Prisma.Decimal(0);
      const custoReal = actual?._sum.custoTotal ?? new Prisma.Decimal(0);
      const diferencaQuantidade = quantidadeConsumida.minus(quantidadeOrcada);
      const desvioCusto = custoReal.minus(custoTotalOrcado);
      const percentualQuantidade = quantidadeOrcada.gt(0) ? quantidadeConsumida.div(quantidadeOrcada).mul(100) : new Prisma.Decimal(0);
      const percentualCusto = custoTotalOrcado.gt(0) ? custoReal.div(custoTotalOrcado).mul(100) : new Prisma.Decimal(0);
      return {
        materialId: item.materialId,
        codigo: item.material.codigo,
        material: item.material.nome,
        categoria: item.categoriaMaterial?.nome || item.material.categoriaMaterial?.nome || null,
        etapaObra: item.etapaObra,
        centroCusto: item.centroCusto?.nome || null,
        quantidadeOrcada: quantidadeOrcada.toString(),
        quantidadeConsumida: quantidadeConsumida.toString(),
        diferencaQuantidade: diferencaQuantidade.toString(),
        percentualQuantidade: percentualQuantidade.toFixed(2),
        custoOrcado: custoTotalOrcado.toString(),
        custoReal: custoReal.toString(),
        desvioCusto: desvioCusto.toString(),
        percentualCusto: percentualCusto.toFixed(2),
        situacao: desvioCusto.gt(0) || diferencaQuantidade.gt(0) ? 'ACIMA' : 'DENTRO',
      };
    });

    const totals = items.reduce((acc, item) => ({
      quantidadeOrcada: acc.quantidadeOrcada.plus(item.quantidadeOrcada),
      quantidadeConsumida: acc.quantidadeConsumida.plus(item.quantidadeConsumida),
      custoOrcado: acc.custoOrcado.plus(item.custoOrcado),
      custoReal: acc.custoReal.plus(item.custoReal),
    }), {
      quantidadeOrcada: new Prisma.Decimal(0),
      quantidadeConsumida: new Prisma.Decimal(0),
      custoOrcado: new Prisma.Decimal(0),
      custoReal: new Prisma.Decimal(0),
    });

    return {
      budget: { id: budget.id, obra: budget.obra, versao: budget.versao, status: budget.status, dataReferencia: budget.dataReferencia },
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
      itens: { include: { material: { include: { categoriaMaterial: true } }, categoriaMaterial: true, centroCusto: true }, orderBy: { material: { nome: 'asc' as const } } },
    };
  }

  private async audit(userId: string, action: string, entityId: string, before: unknown, after: unknown) {
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
