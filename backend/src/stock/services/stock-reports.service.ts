import { Injectable } from '@nestjs/common';
import { Prisma, TipoMovimentoEstoque } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { normalizePagination } from './stock-common';

type ReportQuery = PaginationQueryDto & {
  formato?: 'json' | 'csv';
  dataInicio?: string;
  dataFim?: string;
  obraId?: string;
  materialId?: string;
  localEstoqueId?: string;
  categoriaMaterialId?: string;
  tipo?: TipoMovimentoEstoque;
  status?: string;
};

@Injectable()
export class StockReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(
    dataInicio?: string,
    dataFim?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!dataInicio && !dataFim) {
      return undefined;
    }

    const filter: Prisma.DateTimeFilter = {};

    if (dataInicio) {
      filter.gte = new Date(`${dataInicio}T00:00:00.000`);
    }

    if (dataFim) {
      const end = new Date(`${dataFim}T00:00:00.000`);
      end.setDate(end.getDate() + 1);

      filter.lt = end;
    }

    return filter;
  }

  async position(query: ReportQuery) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.SaldoEstoqueWhereInput = {
      ...(query.materialId ? { materialId: query.materialId } : {}),
      ...(query.localEstoqueId ? { localEstoqueId: query.localEstoqueId } : {}),
      ...(query.obraId ? { localEstoque: { obraId: query.obraId } } : {}),
      ...(query.categoriaMaterialId ? { material: { categoriaMaterialId: query.categoriaMaterialId } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.saldoEstoque.findMany({
        where,
        skip,
        take,
        include: { material: { include: { categoriaMaterial: true } }, localEstoque: { include: { obra: true } } },
        orderBy: [{ material: { nome: 'asc' } }, { localEstoque: { nome: 'asc' } }],
      }),
      this.prisma.saldoEstoque.count({ where }),
    ]);
    const items = rows.map((row) => ({
      materialCodigo: row.material.codigo,
      material: row.material.nome,
      categoria: row.material.categoriaMaterial?.nome || null,
      local: row.localEstoque.nome,
      obra: row.localEstoque.obra?.nome || null,
      quantidade: row.quantidade.toString(),
      reservada: row.quantidadeReservada.toString(),
      disponivel: new Prisma.Decimal(row.quantidade).minus(row.quantidadeReservada).toString(),
      custoMedio: row.custoMedio.toString(),
      valorTotal: row.valorTotal.toString(),
    }));
    return this.respond(items, { total, skip, take }, query, 'posicao_estoque');
  }

  async movements(query: ReportQuery) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.MovimentoEstoqueWhereInput = {
      ...(query.materialId ? { materialId: query.materialId } : {}),
      ...(query.obraId ? { obraId: query.obraId } : {}),
      ...(query.localEstoqueId ? { OR: [{ localOrigemId: query.localEstoqueId }, { localDestinoId: query.localEstoqueId }] } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(this.dateRange(query.dataInicio, query.dataFim)
        ? {
            dataMovimento: this.dateRange(
              query.dataInicio,
              query.dataFim,
            ),
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.movimentoEstoque.findMany({
        where,
        skip,
        take,
        include: { material: true, obra: true, localOrigem: true, localDestino: true, fornecedor: true, registradoPor: true },
        orderBy: { dataMovimento: 'desc' },
      }),
      this.prisma.movimentoEstoque.count({ where }),
    ]);
    const items = rows.map((row) => ({
      numero: row.numero,
      data: row.dataMovimento.toISOString(),
      tipo: row.tipo,
      status: row.status,
      materialCodigo: row.material.codigo,
      material: row.material.nome,
      origem: row.localOrigem?.nome || null,
      destino: row.localDestino?.nome || null,
      obra: row.obra?.nome || null,
      fornecedor: row.fornecedor?.nomeFantasia || null,
      quantidade: row.quantidade.toString(),
      custoUnitario: row.custoUnitario?.toString() || null,
      custoTotal: row.custoTotal?.toString() || null,
      usuario: row.registradoPor?.nome || null,
    }));
    return this.respond(items, { total, skip, take }, query, 'movimentacoes_estoque');
  }

  async consumptionByProject(query: ReportQuery) {
    const where: Prisma.ApropriacaoCustoEstoqueWhereInput = {
      ...(query.obraId ? { obraId: query.obraId } : {}),
      ...(query.materialId ? { materialId: query.materialId } : {}),
      ...(this.dateRange(query.dataInicio, query.dataFim)
        ? {
            dataCompetencia: this.dateRange(
              query.dataInicio,
              query.dataFim,
            ),
          }
        : {}),
    };
    const grouped = await this.prisma.apropriacaoCustoEstoque.groupBy({
      by: ['obraId', 'materialId', 'centroCustoId'],
      where,
      _sum: { quantidade: true, custoTotal: true },
      orderBy: { _sum: { custoTotal: 'desc' } },
    });
    const [obras, materiais, centros] = await Promise.all([
      this.prisma.obra.findMany({ where: { id: { in: grouped.map((g) => g.obraId) } }, select: { id: true, nome: true } }),
      this.prisma.material.findMany({ where: { id: { in: grouped.map((g) => g.materialId) } }, select: { id: true, codigo: true, nome: true } }),
      this.prisma.centroCusto.findMany({ where: { id: { in: grouped.map((g) => g.centroCustoId).filter(Boolean) as string[] } }, select: { id: true, nome: true } }),
    ]);
    const obraById = new Map(obras.map((o) => [o.id, o.nome]));
    const materialById = new Map(materiais.map((m) => [m.id, m]));
    const centroById = new Map(centros.map((c) => [c.id, c.nome]));
    const items = grouped.map((row) => {
      const material = materialById.get(row.materialId);
      return {
        obra: obraById.get(row.obraId) || row.obraId,
        materialCodigo: material?.codigo || row.materialId,
        material: material?.nome || row.materialId,
        centroCusto: row.centroCustoId ? centroById.get(row.centroCustoId) || row.centroCustoId : null,
        quantidadeConsumida: row._sum.quantidade?.toString() || '0',
        custoTotal: row._sum.custoTotal?.toString() || '0',
      };
    });
    return this.respond(items, { total: items.length, skip: 0, take: items.length }, query, 'consumo_por_obra');
  }

  async losses(query: ReportQuery) {
    const report =
      await this.movements({
        ...query,
        tipo: TipoMovimentoEstoque.SAIDA_PERDA,
        formato: 'json',
      }) as any;

    const items = report.items || [];

    return this.respond(
      items,
      {
        total: report.total || items.length,
        skip: report.skip || 0,
        take: report.take || items.length,
      },
      query,
      'perdas_desperdicios_estoque',
    );
  }

  async abc(query: ReportQuery) {
    const baseQuery = {
      ...query,
      formato: 'json' as const,
    };

    const report =
      await this.consumptionByProject(baseQuery) as any;

    const groupedByMaterial = new Map<
      string,
      {
        materialCodigo: string;
        material: string;
        quantidadeConsumida: Prisma.Decimal;
        custoTotal: Prisma.Decimal;
      }
    >();

    for (const item of report.items || []) {
      const key = item.materialCodigo;

      const existing = groupedByMaterial.get(key);

      if (existing) {
        existing.quantidadeConsumida =
          existing.quantidadeConsumida.plus(
            item.quantidadeConsumida || 0,
          );

        existing.custoTotal =
          existing.custoTotal.plus(
            item.custoTotal || 0,
          );

        continue;
      }

      groupedByMaterial.set(key, {
        materialCodigo: item.materialCodigo,
        material: item.material,
        quantidadeConsumida:
          new Prisma.Decimal(
            item.quantidadeConsumida || 0,
          ),
        custoTotal:
          new Prisma.Decimal(
            item.custoTotal || 0,
          ),
      });
    }

    const sorted = Array.from(
      groupedByMaterial.values(),
    ).sort(
      (a, b) =>
        b.custoTotal.comparedTo(a.custoTotal),
    );

    const totalValue = sorted.reduce(
      (sum, item) =>
        sum.plus(item.custoTotal),
      new Prisma.Decimal(0),
    );

    let accumulated =
      new Prisma.Decimal(0);

    const items = sorted.map(
      (item, index) => {
        accumulated =
          accumulated.plus(item.custoTotal);

        const percentual =
          totalValue.gt(0)
            ? item.custoTotal
                .div(totalValue)
                .mul(100)
            : new Prisma.Decimal(0);

        const percentualAcumulado =
          totalValue.gt(0)
            ? accumulated
                .div(totalValue)
                .mul(100)
            : new Prisma.Decimal(0);

        let classe = 'C';

        if (
          percentualAcumulado.lte(80)
        ) {
          classe = 'A';
        } else if (
          percentualAcumulado.lte(95)
        ) {
          classe = 'B';
        }

        return {
          posicao: index + 1,
          materialCodigo:
            item.materialCodigo,
          material:
            item.material,
          quantidadeConsumida:
            item.quantidadeConsumida.toString(),
          custoTotal:
            item.custoTotal.toString(),
          percentual:
            percentual.toFixed(2),
          percentualAcumulado:
            percentualAcumulado.toFixed(2),
          classe,
        };
      },
    );

    return this.respond(
      items,
      {
        total: items.length,
        skip: 0,
        take: items.length,
      },
      query,
      'curva_abc_estoque',
    );
  }

  async purchaseSuggestion(query: ReportQuery) {
    const balances = await this.prisma.saldoEstoque.findMany({
      where: { material: { ativo: true }, ...(query.categoriaMaterialId ? { material: { ativo: true, categoriaMaterialId: query.categoriaMaterialId } } : {}) },
      include: { material: { include: { categoriaMaterial: true } }, localEstoque: true },
      orderBy: [{ material: { nome: 'asc' } }],
    });
    const items = balances
      .map((row) => {
        const available = new Prisma.Decimal(row.quantidade).minus(row.quantidadeReservada);
        const reorder = new Prisma.Decimal(row.material.pontoReposicao || row.material.estoqueMinimo || 0);
        const target = new Prisma.Decimal(row.material.estoqueMaximo || row.material.estoqueMinimo || reorder);
        const suggested = Prisma.Decimal.max(target.minus(available), new Prisma.Decimal(0));
        return {
          materialCodigo: row.material.codigo,
          material: row.material.nome,
          categoria: row.material.categoriaMaterial?.nome || null,
          local: row.localEstoque.nome,
          disponivel: available.toString(),
          estoqueMinimo: row.material.estoqueMinimo.toString(),
          pontoReposicao: row.material.pontoReposicao.toString(),
          estoqueMaximo: row.material.estoqueMaximo?.toString() || null,
          quantidadeSugerida: suggested.toString(),
          custoEstimado: suggested.mul(row.custoMedio).toString(),
        };
      })
      .filter((item) => new Prisma.Decimal(item.quantidadeSugerida).gt(0));
    return this.respond(items, { total: items.length, skip: 0, take: items.length }, query, 'sugestao_compra_estoque');
  }

  private respond(items: Record<string, unknown>[], meta: Record<string, unknown>, query: ReportQuery, filename: string) {
    if (query.formato === 'csv') {
      return { filename: `${filename}.csv`, mimeType: 'text/csv', content: this.toCsv(items) };
    }
    return { items, ...meta };
  }

  private toCsv(items: Record<string, unknown>[]) {
    if (!items.length) return '';
    const headers = Object.keys(items[0]);
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [headers.join(';'), ...items.map((item) => headers.map((header) => escape(item[header])).join(';'))].join('\n');
  }
}
