import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusInventarioEstoque, TipoMovimentoEstoque } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CountStockInventoryDto } from '../dto/count-stock-inventory.dto';
import { CreateStockInventoryDto } from '../dto/create-stock-inventory.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { normalizePagination, stringifyAudit } from './stock-common';
import { StockCostingService } from './stock-costing.service';
import { StockMovementService } from './stock-movement.service';

@Injectable()
export class StockInventoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costing: StockCostingService,
    private readonly movementService: StockMovementService,
  ) {}

  async create(dto: CreateStockInventoryDto, userId: string) {
    const location = await this.prisma.localEstoque.findUnique({ where: { id: dto.localEstoqueId } });
    if (!location || !location.ativo) throw new NotFoundException('Local de estoque ativo não encontrado');

    const balances = await this.prisma.saldoEstoque.findMany({
      where: { localEstoqueId: dto.localEstoqueId },
      include: { material: true },
      orderBy: { updatedAt: 'desc' },
    });

    const inventory = await this.prisma.inventarioEstoque.create({
      data: {
        localEstoqueId: dto.localEstoqueId,
        criadoPorId: userId,
        observacao: dto.observacao?.trim() || null,
        itens: {
          create: balances.map((balance) => ({
            materialId: balance.materialId,
            quantidadeSistema: balance.quantidade,
            quantidadeContada: balance.quantidade,
            diferenca: new Prisma.Decimal(0),
            custoMedio: balance.custoMedio,
            valorDiferenca: new Prisma.Decimal(0),
          })),
        },
      },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_INVENTARIO_ABERTO', inventory.id, null, inventory);
    return inventory;
  }

  async findAll(query: PaginationQueryDto & { status?: StatusInventarioEstoque; localEstoqueId?: string }) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.InventarioEstoqueWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.localEstoqueId ? { localEstoqueId: query.localEstoqueId } : {}),
      ...(query.search
        ? {
            OR: [
              { observacao: { contains: query.search, mode: 'insensitive' } },
              { localEstoque: { nome: { contains: query.search, mode: 'insensitive' } } },
              { localEstoque: { codigo: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventarioEstoque.findMany({
        where,
        skip,
        take,
        include: { localEstoque: true, criadoPor: true, aprovadoPor: true, _count: { select: { itens: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventarioEstoque.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const inventory = await this.prisma.inventarioEstoque.findUnique({ where: { id }, include: this.includeRelations() });
    if (!inventory) throw new NotFoundException('Inventário não encontrado');
    return inventory;
  }

  async count(id: string, dto: CountStockInventoryDto, userId: string) {
    const inventory = await this.findOne(id);
    if (![StatusInventarioEstoque.ABERTO, StatusInventarioEstoque.EM_CONTAGEM].includes(inventory.status as any)) {
      throw new BadRequestException('Inventário não está aberto para contagem');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!material || !material.ativo) throw new NotFoundException('Material ativo não encontrado');
        const counted = this.costing.assertNonNegative(item.quantidadeContada, 'quantidadeContada');
        const balance = await tx.saldoEstoque.findUnique({
          where: { materialId_localEstoqueId: { materialId: item.materialId, localEstoqueId: inventory.localEstoqueId } },
        });
        const systemQty = balance?.quantidade ?? new Prisma.Decimal(0);
        const averageCost = balance?.custoMedio ?? material.custoMedio ?? new Prisma.Decimal(0);
        const diff = counted.minus(systemQty);
        const valueDiff = diff.mul(averageCost);
        await tx.itemInventarioEstoque.upsert({
          where: { inventarioId_materialId: { inventarioId: id, materialId: item.materialId } },
          create: {
            inventarioId: id,
            materialId: item.materialId,
            quantidadeSistema: systemQty,
            quantidadeContada: counted,
            diferenca: diff,
            custoMedio: averageCost,
            valorDiferenca: valueDiff,
            justificativa: item.justificativa?.trim() || null,
          },
          update: {
            quantidadeSistema: systemQty,
            quantidadeContada: counted,
            diferenca: diff,
            custoMedio: averageCost,
            valorDiferenca: valueDiff,
            justificativa: item.justificativa?.trim() || null,
          },
        });
      }
      return tx.inventarioEstoque.update({
        where: { id },
        data: { status: StatusInventarioEstoque.EM_CONTAGEM },
        include: this.includeRelations(),
      });
    });
    await this.audit(userId, 'ESTOQUE_INVENTARIO_CONTADO', id, inventory, updated);
    return updated;
  }

  async approve(id: string, userId: string) {
    const before = await this.findOne(id);
    if (![StatusInventarioEstoque.EM_CONTAGEM, StatusInventarioEstoque.PENDENTE_APROVACAO].includes(before.status as any)) {
      throw new BadRequestException('Inventário deve estar contado para aprovação');
    }
    const updated = await this.prisma.inventarioEstoque.update({
      where: { id },
      data: { status: StatusInventarioEstoque.APROVADO, aprovadoPorId: userId },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_INVENTARIO_APROVADO', id, before, updated);
    return updated;
  }

  async close(id: string, userId: string) {
    const inventory = await this.findOne(id);
    if (inventory.status !== StatusInventarioEstoque.APROVADO) {
      throw new BadRequestException('Inventário deve estar aprovado para fechamento');
    }

    for (const item of inventory.itens) {
      const diff = new Prisma.Decimal(item.diferenca);
      if (diff.eq(0)) continue;
      await this.movementService.execute(
        {
          tipo: diff.gt(0) ? TipoMovimentoEstoque.ENTRADA_AJUSTE : TipoMovimentoEstoque.SAIDA_AJUSTE,
          materialId: item.materialId,
          localDestinoId: diff.gt(0) ? inventory.localEstoqueId : undefined,
          localOrigemId: diff.lt(0) ? inventory.localEstoqueId : undefined,
          quantidade: diff.abs().toString(),
          unidade: item.material.unidade,
          custoUnitario: item.custoMedio.toString(),
          documentoTipo: 'INVENTARIO',
          documentoNumero: id,
          observacao: item.justificativa || `Ajuste gerado pelo inventário ${id}`,
        },
        userId,
      );
    }

    const updated = await this.prisma.inventarioEstoque.update({
      where: { id },
      data: { status: StatusInventarioEstoque.FECHADO, dataFechamento: new Date() },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_INVENTARIO_FECHADO', id, inventory, updated);
    return updated;
  }

  private includeRelations() {
    return {
      localEstoque: true,
      criadoPor: true,
      aprovadoPor: true,
      itens: { include: { material: { include: { categoriaMaterial: true } } }, orderBy: { material: { nome: 'asc' as const } } },
    };
  }

  private async audit(userId: string, action: string, entityId: string, before: unknown, after: unknown) {
    await this.prisma.logAuditoria.create({
      data: {
        usuarioId: userId,
        acao: action,
        tabela: 'inventarios_estoque',
        registroId: entityId,
        valorAntigo: before ? stringifyAudit(before) : null,
        valorNovo: after ? stringifyAudit(after) : null,
        motivo: 'Operação de inventário de estoque',
      },
    });
  }
}
