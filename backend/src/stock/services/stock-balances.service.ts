import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoMovimentoEstoque } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockBalanceQueryDto } from '../dto/stock-balance-query.dto';
import { normalizePagination } from './stock-common';
import { StockMovementService } from './stock-movement.service';
import { AdjustStockBalanceDto } from '../dto/adjust-stock-balance.dto';

@Injectable()
export class StockBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementService: StockMovementService,
  ) {}

  async findAll(query: StockBalanceQueryDto) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.SaldoEstoqueWhereInput = {
      ...(query.materialId ? { materialId: query.materialId } : {}),
      ...(query.localEstoqueId ? { localEstoqueId: query.localEstoqueId } : {}),
      ...(query.obraId ? { localEstoque: { obraId: query.obraId } } : {}),
      ...(query.categoriaMaterialId
        ? { material: { categoriaMaterialId: query.categoriaMaterialId } }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                material: {
                  nome: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                material: {
                  codigo: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                localEstoque: {
                  nome: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                localEstoque: {
                  codigo: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.saldoEstoque.findMany({
        where,
        skip,
        take,
        include: {
          material: { include: { categoriaMaterial: true } },
          localEstoque: { include: { obra: true } },
        },
        orderBy: [
          { material: { nome: 'asc' } },
          { localEstoque: { nome: 'asc' } },
        ],
      }),
      this.prisma.saldoEstoque.count({ where }),
    ]);

    const mapped = items.map((item) => this.mapBalance(item));
    const filtered = query.situacao
      ? mapped.filter((item) => item.situacao === query.situacao)
      : mapped;
    return {
      items: filtered,
      total: query.situacao ? filtered.length : total,
      skip,
      take,
    };
  }

  async summary() {
    const aggregate = await this.prisma.saldoEstoque.aggregate({
      _sum: { valorTotal: true, quantidade: true, quantidadeReservada: true },
    });
    const materiaisCadastrados = await this.prisma.material.count({
      where: { ativo: true },
    });
    const lowStock = await this.lowStock({ take: '1000' });

    const quantidadeFisica = aggregate._sum.quantidade || new Prisma.Decimal(0);

    const quantidadeReservada =
      aggregate._sum.quantidadeReservada || new Prisma.Decimal(0);

    return {
      valorTotalEstoque: aggregate._sum.valorTotal || new Prisma.Decimal(0),
      quantidadeFisica,
      quantidadeReservada,
      quantidadeDisponivel: quantidadeFisica.minus(quantidadeReservada),
      materiaisCadastrados,
      materiaisAbaixoMinimo: lowStock.total,
    };
  }

  async lowStock(query: Pick<StockBalanceQueryDto, 'skip' | 'take'> = {}) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const items = await this.prisma.saldoEstoque.findMany({
      where: { material: { ativo: true } },
      include: {
        material: { include: { categoriaMaterial: true } },
        localEstoque: { include: { obra: true } },
      },
      orderBy: [{ material: { nome: 'asc' } }],
    });
    const mapped = items
      .map((item) => this.mapBalance(item))
      .filter((item) =>
        ['REPOSICAO', 'BAIXO', 'ZERADO', 'NEGATIVO'].includes(item.situacao),
      );
    return {
      items: mapped.slice(skip, skip + take),
      total: mapped.length,
      skip,
      take,
    };
  }

  private mapBalance(item: any) {
    const quantidade = new Prisma.Decimal(item.quantidade);
    const reservada = new Prisma.Decimal(item.quantidadeReservada);
    const disponivel = quantidade.minus(reservada);
    const minimo = new Prisma.Decimal(item.material.estoqueMinimo || 0);
    const reposicao = new Prisma.Decimal(item.material.pontoReposicao || 0);

    let situacao: 'NORMAL' | 'REPOSICAO' | 'BAIXO' | 'ZERADO' | 'NEGATIVO' =
      'NORMAL';

    if (disponivel.lt(0)) {
      situacao = 'NEGATIVO';
    } else if (disponivel.eq(0)) {
      situacao = 'ZERADO';
    } else if (minimo.gt(0) && disponivel.lte(minimo)) {
      situacao = 'BAIXO';
    } else if (reposicao.gt(0) && disponivel.lte(reposicao)) {
      situacao = 'REPOSICAO';
    }

    return {
      ...item,
      quantidadeDisponivel: disponivel,
      situacao,
    };
  }

  async adjust(dto: AdjustStockBalanceDto, userId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
    });
    if (!material) throw new NotFoundException('Material não encontrado');

    const amount = Number(dto.quantidade);
    if (amount === 0) {
      return this.prisma.saldoEstoque.findUnique({
        where: {
          materialId_localEstoqueId: {
            materialId: dto.materialId,
            localEstoqueId: dto.localEstoqueId,
          },
        },
      });
    }

    const isEntry = amount > 0;
    const absAmount = Math.abs(amount);

    return this.movementService.execute(
      {
        tipo: isEntry
          ? TipoMovimentoEstoque.ENTRADA_AJUSTE
          : TipoMovimentoEstoque.SAIDA_AJUSTE,
        materialId: dto.materialId,
        [isEntry ? 'localDestinoId' : 'localOrigemId']: dto.localEstoqueId,
        quantidade: String(absAmount),
        unidade: material.unidade,
        custoUnitario:
          dto.custoUnitario != null ? String(dto.custoUnitario) : undefined,
        observacao: dto.observacao || 'Ajuste manual de saldo',
        permitirSaldoNegativo: dto.permitirSaldoNegativo,
        justificativaSaldoNegativo: dto.justificativaSaldoNegativo,
      },
      userId,
    );
  }
}
