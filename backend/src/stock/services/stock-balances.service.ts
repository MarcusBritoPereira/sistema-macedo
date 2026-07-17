import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockBalanceQueryDto } from '../dto/stock-balance-query.dto';
import { normalizePagination } from './stock-common';

@Injectable()
export class StockBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: StockBalanceQueryDto) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.SaldoEstoqueWhereInput = {
      ...(query.materialId ? { materialId: query.materialId } : {}),
      ...(query.localEstoqueId ? { localEstoqueId: query.localEstoqueId } : {}),
      ...(query.obraId ? { localEstoque: { obraId: query.obraId } } : {}),
      ...(query.categoriaMaterialId ? { material: { categoriaMaterialId: query.categoriaMaterialId } } : {}),
      ...(query.search
        ? {
            OR: [
              { material: { nome: { contains: query.search, mode: 'insensitive' } } },
              { material: { codigo: { contains: query.search, mode: 'insensitive' } } },
              { localEstoque: { nome: { contains: query.search, mode: 'insensitive' } } },
              { localEstoque: { codigo: { contains: query.search, mode: 'insensitive' } } },
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
        orderBy: [{ material: { nome: 'asc' } }, { localEstoque: { nome: 'asc' } }],
      }),
      this.prisma.saldoEstoque.count({ where }),
    ]);

    const mapped = items.map((item) => this.mapBalance(item));
    const filtered = query.situacao ? mapped.filter((item) => item.situacao === query.situacao) : mapped;
    return { items: filtered, total: query.situacao ? filtered.length : total, skip, take };
  }

  async summary() {
    const aggregate = await this.prisma.saldoEstoque.aggregate({
      _sum: { valorTotal: true, quantidade: true, quantidadeReservada: true },
    });
    const materiaisCadastrados = await this.prisma.material.count({ where: { ativo: true } });
    const lowStock = await this.lowStock({ take: '1000' });

    return {
      valorTotalEstoque: aggregate._sum.valorTotal || new Prisma.Decimal(0),
      quantidadeFisica: aggregate._sum.quantidade || new Prisma.Decimal(0),
      quantidadeReservada: aggregate._sum.quantidadeReservada || new Prisma.Decimal(0),
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
      .filter((item) => ['BAIXO', 'CRITICO', 'ZERADO', 'NEGATIVO'].includes(item.situacao));
    return { items: mapped.slice(skip, skip + take), total: mapped.length, skip, take };
  }

  private mapBalance(item: any) {
    const quantidade = new Prisma.Decimal(item.quantidade);
    const reservada = new Prisma.Decimal(item.quantidadeReservada);
    const disponivel = quantidade.minus(reservada);
    const minimo = new Prisma.Decimal(item.material.estoqueMinimo || 0);
    const reposicao = new Prisma.Decimal(item.material.pontoReposicao || 0);

    let situacao: 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERADO' | 'NEGATIVO' = 'NORMAL';
    if (quantidade.lt(0)) situacao = 'NEGATIVO';
    else if (quantidade.eq(0)) situacao = 'ZERADO';
    else if (minimo.gt(0) && quantidade.lte(minimo)) situacao = 'CRITICO';
    else if (reposicao.gt(0) && quantidade.lte(reposicao)) situacao = 'BAIXO';

    return { ...item, quantidadeDisponivel: disponivel, situacao };
  }
}
