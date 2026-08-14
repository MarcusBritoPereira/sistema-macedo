import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockMaterialDto } from '../dto/create-stock-material.dto';
import { UpdateStockMaterialDto } from '../dto/update-stock-material.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import {
  cleanString,
  normalizePagination,
  stringifyAudit,
  toOptionalDecimal,
} from './stock-common';

import { StockMovementService } from './stock-movement.service';

@Injectable()
export class StockMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementService: StockMovementService,
  ) {}

  async create(dto: CreateStockMaterialDto, userId: string) {
    const data = await this.sanitize(dto, userId);
    await this.ensureUnique(
      dto.codigo,
      dto.codigoBarras,
      undefined,
      data.nome as string,
    );
    await this.ensureActiveCategory(data.categoriaMaterialId as string);

    const material = await this.prisma.material.create({
      data: data as any,
      include: this.includeRelations(),
    });

    if (dto.estoqueInicial && dto.localEstoqueInicialId) {
      const quantidade = new Prisma.Decimal(dto.estoqueInicial);
      if (quantidade.gt(0)) {
        try {
          await this.movementService.execute(
            {
              tipo: 'ENTRADA_AJUSTE',
              materialId: material.id,
              localDestinoId: dto.localEstoqueInicialId,
              quantidade: quantidade.toString(),
              unidade: material.unidade,
              custoUnitario: dto.custoUnitarioInicial || dto.custoPadrao || '0',
              observacao: 'Estoque inicial',
              dataMovimento: new Date().toISOString(),
            },
            userId,
          );
        } catch (error) {
          await this.prisma.material.delete({ where: { id: material.id } });
          throw error;
        }
      }
    }

    await this.audit(
      userId,
      'ESTOQUE_MATERIAL_CRIADO',
      material.id,
      null,
      material,
    );
    return material;
  }

  async findAll(
    query: PaginationQueryDto & {
      categoriaMaterialId?: string;
      ativo?: string;
    },
  ) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.MaterialWhereInput = {
      ...(query.categoriaMaterialId
        ? { categoriaMaterialId: query.categoriaMaterialId }
        : {}),
      ...(query.ativo !== undefined ? { ativo: query.ativo === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { codigo: { contains: query.search, mode: 'insensitive' } },
              { nome: { contains: query.search, mode: 'insensitive' } },
              { descricao: { contains: query.search, mode: 'insensitive' } },
              { codigoBarras: { contains: query.search, mode: 'insensitive' } },
              { marca: { contains: query.search, mode: 'insensitive' } },
              { fabricante: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where,
        skip,
        take,
        include: {
          ...this.includeRelations(),
          saldos: {
            select: {
              quantidade: true,
              quantidadeReservada: true,
              custoMedio: true,
              valorTotal: true,
            },
          },
        },
        orderBy: [{ nome: 'asc' }],
      }),
      this.prisma.material.count({ where }),
    ]);

    return {
      items: items.map((item) => {
        const saldoTotal = item.saldos.reduce(
          (acc, saldo) => acc.plus(saldo.quantidade),
          new Prisma.Decimal(0),
        );

        const saldoReservado = item.saldos.reduce(
          (acc, saldo) => acc.plus(saldo.quantidadeReservada),
          new Prisma.Decimal(0),
        );

        const saldoDisponivel = saldoTotal.minus(saldoReservado);

        const valorTotalEstoque = item.saldos.reduce(
          (acc, saldo) => acc.plus(saldo.valorTotal),
          new Prisma.Decimal(0),
        );

        const custoMedio = saldoTotal.gt(0)
          ? valorTotalEstoque.div(saldoTotal)
          : item.custoMedio || new Prisma.Decimal(0);

        const estoqueMinimo = item.estoqueMinimo || new Prisma.Decimal(0);

        const pontoReposicao = item.pontoReposicao || new Prisma.Decimal(0);

        let situacaoEstoque:
          | 'NORMAL'
          | 'REPOSICAO'
          | 'BAIXO'
          | 'ZERADO'
          | 'NEGATIVO'
          | 'INATIVO' = 'NORMAL';

        if (!item.ativo) {
          situacaoEstoque = 'INATIVO';
        } else if (saldoDisponivel.lt(0)) {
          situacaoEstoque = 'NEGATIVO';
        } else if (saldoDisponivel.eq(0)) {
          situacaoEstoque = 'ZERADO';
        } else if (estoqueMinimo.gt(0) && saldoDisponivel.lte(estoqueMinimo)) {
          situacaoEstoque = 'BAIXO';
        } else if (
          pontoReposicao.gt(0) &&
          saldoDisponivel.lte(pontoReposicao)
        ) {
          situacaoEstoque = 'REPOSICAO';
        }

        const { saldos, ...material } = item;

        return {
          ...material,
          saldoTotal,
          saldoReservado,
          saldoDisponivel,
          custoMedio,
          valorTotalEstoque,
          situacaoEstoque,
          quantidadeLocais: saldos.length,
        };
      }),
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!material) throw new NotFoundException('Material não encontrado');
    return material;
  }

  async update(id: string, dto: UpdateStockMaterialDto, userId: string) {
    const current = await this.findOne(id);
    const data = await this.sanitize(dto);
    if (
      data.codigo ||
      data.codigoBarras !== undefined ||
      data.nome !== undefined
    ) {
      await this.ensureUnique(
        data.codigo as string | undefined,
        data.codigoBarras as string | null | undefined,
        id,
        data.nome as string | undefined,
      );
    }
    if (data.categoriaMaterialId)
      await this.ensureActiveCategory(data.categoriaMaterialId as string);

    const updated = await this.prisma.material.update({
      where: { id },
      data: data as any,
      include: this.includeRelations(),
    });
    await this.audit(
      userId,
      'ESTOQUE_MATERIAL_ATUALIZADO',
      id,
      current,
      updated,
    );
    return updated;
  }

  async remove(id: string, userId: string) {
    const current = await this.findOne(id);
    const movements = await this.prisma.movimentoEstoque.findMany({
      where: { materialId: id },
    });

    if (movements.length > 0) {
      if (
        movements.length === 1 &&
        movements[0].tipo === 'ENTRADA_AJUSTE' &&
        movements[0].observacao === 'Estoque inicial'
      ) {
        // Can be hard-deleted, so we delete the movement and balance first
        await this.prisma.movimentoEstoque.delete({
          where: { id: movements[0].id },
        });
        await this.prisma.saldoEstoque.deleteMany({
          where: { materialId: id },
        });
      } else {
        const updated = await this.prisma.material.update({
          where: { id },
          data: { ativo: false },
          include: this.includeRelations(),
        });
        await this.audit(
          userId,
          'ESTOQUE_MATERIAL_INATIVADO',
          id,
          current,
          updated,
        );
        return updated;
      }
    }

    const deleted = await this.prisma.material.delete({ where: { id } });
    await this.audit(userId, 'ESTOQUE_MATERIAL_REMOVIDO', id, current, deleted);
    return deleted;
  }

  async balances(id: string) {
    await this.findOne(id);
    return this.prisma.saldoEstoque.findMany({
      where: { materialId: id },
      include: { localEstoque: { include: { obra: true, responsavel: true } } },
      orderBy: { localEstoque: { nome: 'asc' } },
    });
  }

  async movements(id: string, query: PaginationQueryDto) {
    await this.findOne(id);
    const { skip, take } = normalizePagination(query.skip, query.take);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.movimentoEstoque.findMany({
        where: { materialId: id },
        skip,
        take,
        include: {
          localOrigem: true,
          localDestino: true,
          obra: true,
          fornecedor: true,
          registradoPor: { select: { id: true, nome: true, email: true } },
        },
        orderBy: { dataMovimento: 'desc' },
      }),
      this.prisma.movimentoEstoque.count({ where: { materialId: id } }),
    ]);
    return { items, total, skip, take };
  }

  private includeRelations() {
    return {
      categoriaMaterial: {
        include: { categoriaFinanceira: true, centroCustoPadrao: true },
      },
      criadoPor: { select: { id: true, nome: true, email: true } },
    };
  }

  private async sanitize(
    dto: CreateStockMaterialDto | UpdateStockMaterialDto,
    userId?: string,
  ) {
    const data:
      | Prisma.MaterialUncheckedCreateInput
      | Prisma.MaterialUncheckedUpdateInput = {};
    if (dto.codigo !== undefined) {
      const codigo = dto.codigo.trim();
      if (!codigo)
        throw new BadRequestException('Código do material é obrigatório');
      data.codigo = codigo;
    }
    if (dto.nome !== undefined) {
      const nome = dto.nome.trim();
      if (!nome)
        throw new BadRequestException('Nome do material é obrigatório');
      data.nome = nome;
    }
    if (dto.descricao !== undefined)
      data.descricao = cleanString(dto.descricao);
    if (dto.categoriaMaterialId !== undefined)
      data.categoriaMaterialId = dto.categoriaMaterialId;
    if ((dto as any).tipoItem !== undefined)
      (data as any).tipoItem = (dto as any).tipoItem;
    if (dto.unidade !== undefined) data.unidade = dto.unidade;
    if (dto.codigoBarras !== undefined)
      data.codigoBarras = cleanString(dto.codigoBarras);
    if (dto.referenciaFornecedor !== undefined)
      data.referenciaFornecedor = cleanString(dto.referenciaFornecedor);
    if (dto.marca !== undefined) data.marca = cleanString(dto.marca);
    if (dto.fabricante !== undefined)
      data.fabricante = cleanString(dto.fabricante);
    if (dto.estoqueMinimo !== undefined)
      data.estoqueMinimo = this.nonNegative(
        dto.estoqueMinimo,
        'estoque mínimo',
      );
    if (dto.estoqueMaximo !== undefined)
      data.estoqueMaximo = toOptionalDecimal(dto.estoqueMaximo) ?? null;
    if (dto.pontoReposicao !== undefined)
      data.pontoReposicao = this.nonNegative(
        dto.pontoReposicao,
        'ponto de reposição',
      );
    if (dto.custoPadrao !== undefined)
      data.custoPadrao = toOptionalDecimal(dto.custoPadrao) ?? null;
    if (dto.permiteFracionado !== undefined)
      data.permiteFracionado = dto.permiteFracionado;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    if (dto.observacoes !== undefined)
      data.observacoes = cleanString(dto.observacoes);
    if (userId) data.criadoPorId = userId;
    return data;
  }

  private nonNegative(value: string, field: string) {
    const decimal = new Prisma.Decimal(value);
    if (decimal.lt(0))
      throw new BadRequestException(`${field} não pode ser negativo`);
    return decimal;
  }

  private async ensureUnique(
    codigo?: string,
    codigoBarras?: string | null,
    currentId?: string,
    nome?: string,
  ) {
    const or: Prisma.MaterialWhereInput[] = [];
    if (codigo) or.push({ codigo });
    if (codigoBarras) or.push({ codigoBarras });
    if (nome) or.push({ nome: { equals: nome, mode: 'insensitive' } });

    if (!or.length) return;
    const existing = await this.prisma.material.findFirst({
      where: { OR: or, ...(currentId ? { id: { not: currentId } } : {}) },
      select: { id: true, codigo: true, codigoBarras: true, nome: true },
    });

    if (existing) {
      if (nome && existing.nome.toLowerCase() === nome.toLowerCase()) {
        throw new ConflictException(
          'Já existe um material cadastrado com este nome exato',
        );
      }
      throw new ConflictException(
        'Código ou código de barras já cadastrado para outro material',
      );
    }
  }

  private async ensureActiveCategory(id: string) {
    const category = await this.prisma.categoriaMaterial.findUnique({
      where: { id },
    });
    if (!category || !category.ativo)
      throw new BadRequestException(
        'Categoria de material ativa não encontrada',
      );
  }

  private audit(
    userId: string,
    acao: string,
    registroId: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    return this.prisma.logAuditoria.create({
      data: {
        acao,
        tabela: 'materiais',
        registroId,
        valorAntigo: stringifyAudit(oldValue),
        valorNovo: stringifyAudit(newValue),
        motivo: 'Cadastro de material',
        usuarioId: userId,
      },
    });
  }
}
