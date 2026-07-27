import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockCategoryDto } from '../dto/create-stock-category.dto';
import { UpdateStockCategoryDto } from '../dto/update-stock-category.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { cleanString, normalizePagination, stringifyAudit } from './stock-common';

@Injectable()
export class StockCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStockCategoryDto, userId: string) {
    const data = await this.sanitize(dto);
    await this.ensureUniqueName(data.nome as string, data.parentId as string | null | undefined);

    const category = await this.prisma.categoriaMaterial.create({
      data: data as any,
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_CATEGORIA_CRIADA', category.id, null, category);
    return category;
  }

  async findAll(query: PaginationQueryDto) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.CategoriaMaterialWhereInput = {
      ...(query.search
        ? {
            OR: [
              { nome: { contains: query.search, mode: 'insensitive' } },
              { descricao: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.categoriaMaterial.findMany({
        where,
        skip,
        take,
        include: this.includeRelations(),
        orderBy: [{ nome: 'asc' }],
      }),
      this.prisma.categoriaMaterial.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  findTree() {
    return this.prisma.categoriaMaterial.findMany({
      where: { parentId: null },
      include: {
        children: { include: { children: true }, orderBy: { nome: 'asc' } },
        categoriaFinanceira: true,
        centroCustoPadrao: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.categoriaMaterial.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!category) throw new NotFoundException('Categoria de material não encontrada');
    return category;
  }

  async update(id: string, dto: UpdateStockCategoryDto, userId: string) {
    const current = await this.findOne(id);
    const data = await this.sanitize(dto, id);
    const desiredName = (data.nome as string | undefined) ?? current.nome;
    const desiredParent = data.parentId === undefined ? current.parentId : (data.parentId as string | null);
    await this.ensureUniqueName(desiredName, desiredParent, id);

    const updated = await this.prisma.categoriaMaterial.update({
      where: { id },
      data: data as any,
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_CATEGORIA_ATUALIZADA', id, current, updated);
    return updated;
  }

  async remove(id: string, userId: string) {
    const current = await this.findOne(id);
    const updated = await this.prisma.categoriaMaterial.update({
      where: { id },
      data: { ativo: false },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_CATEGORIA_INATIVADA', id, current, updated);
    return updated;
  }

  private includeRelations() {
    return {
      parent: true,
      children: { orderBy: { nome: 'asc' } as const },
      categoriaFinanceira: true,
      centroCustoPadrao: true,
    };
  }

  private async sanitize(dto: CreateStockCategoryDto | UpdateStockCategoryDto, currentId?: string) {
    const data: Prisma.CategoriaMaterialUncheckedCreateInput | Prisma.CategoriaMaterialUncheckedUpdateInput = {};
    if (dto.nome !== undefined) {
      const nome = dto.nome.trim();
      if (!nome) throw new BadRequestException('Nome da categoria é obrigatório');
      data.nome = nome;
    }
    if (dto.descricao !== undefined) data.descricao = cleanString(dto.descricao);
    if (dto.parentId !== undefined) {
      if (dto.parentId === currentId) throw new BadRequestException('Categoria não pode ser pai dela mesma');
      data.parentId = dto.parentId || null;
    }
    if (dto.categoriaFinanceiraId !== undefined) data.categoriaFinanceiraId = dto.categoriaFinanceiraId || null;
    if (dto.centroCustoPadraoId !== undefined) data.centroCustoPadraoId = dto.centroCustoPadraoId || null;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    return data;
  }

  private async ensureUniqueName(nome: string, parentId?: string | null, currentId?: string) {
    const existing = await this.prisma.categoriaMaterial.findFirst({
      where: {
        nome: { equals: nome, mode: 'insensitive' },
        parentId: parentId || null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Já existe uma categoria de material com este nome neste nível');
  }

  private audit(userId: string, acao: string, registroId: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.logAuditoria.create({
      data: {
        acao,
        tabela: 'categorias_material',
        registroId,
        valorAntigo: stringifyAudit(oldValue),
        valorNovo: stringifyAudit(newValue),
        motivo: 'Cadastro de categoria de material',
        usuarioId: userId,
      },
    });
  }
}
