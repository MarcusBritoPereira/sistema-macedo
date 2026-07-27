import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusObra } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockLocationDto } from '../dto/create-stock-location.dto';
import { UpdateStockLocationDto } from '../dto/update-stock-location.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { cleanString, normalizePagination, stringifyAudit } from './stock-common';

@Injectable()
export class StockLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStockLocationDto, userId: string) {
    const data = await this.sanitize(dto);
    await this.ensureUniqueCode(data.codigo as string);
    if (data.obraId) await this.ensureActiveProject(data.obraId as string);

    const location = await this.prisma.localEstoque.create({ data: data as any, include: this.includeRelations() });
    await this.audit(userId, 'ESTOQUE_LOCAL_CRIADO', location.id, null, location);
    return location;
  }

  async findAll(query: PaginationQueryDto & { tipo?: string; obraId?: string; ativo?: string }) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.LocalEstoqueWhereInput = {
      ...(query.tipo ? { tipo: query.tipo as any } : {}),
      ...(query.obraId ? { obraId: query.obraId } : {}),
      ...(query.ativo !== undefined ? { ativo: query.ativo === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { nome: { contains: query.search, mode: 'insensitive' } },
              { codigo: { contains: query.search, mode: 'insensitive' } },
              { endereco: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.localEstoque.findMany({
        where,
        skip,
        take,
        include: this.includeRelations(),
        orderBy: [{ nome: 'asc' }],
      }),
      this.prisma.localEstoque.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const location = await this.prisma.localEstoque.findUnique({ where: { id }, include: this.includeRelations() });
    if (!location) throw new NotFoundException('Local de estoque não encontrado');
    return location;
  }

  async update(id: string, dto: UpdateStockLocationDto, userId: string) {
    const current = await this.findOne(id);
    const data = await this.sanitize(dto);
    if (data.codigo) await this.ensureUniqueCode(data.codigo as string, id);
    if (data.obraId) await this.ensureActiveProject(data.obraId as string);

    const updated = await this.prisma.localEstoque.update({ where: { id }, data, include: this.includeRelations() });
    await this.audit(userId, 'ESTOQUE_LOCAL_ATUALIZADO', id, current, updated);
    return updated;
  }

  async remove(id: string, userId: string) {
    const current = await this.findOne(id);
    const movementCount = await this.prisma.movimentoEstoque.count({
      where: { OR: [{ localOrigemId: id }, { localDestinoId: id }] },
    });
    if (movementCount > 0) {
      const updated = await this.prisma.localEstoque.update({
        where: { id },
        data: { ativo: false },
        include: this.includeRelations(),
      });
      await this.audit(userId, 'ESTOQUE_LOCAL_INATIVADO', id, current, updated);
      return updated;
    }
    const deleted = await this.prisma.localEstoque.delete({ where: { id } });
    await this.audit(userId, 'ESTOQUE_LOCAL_REMOVIDO', id, current, deleted);
    return deleted;
  }

  private includeRelations() {
    return {
      obra: true,
      responsavel: { select: { id: true, nome: true, email: true } },
    };
  }

  private async sanitize(dto: CreateStockLocationDto | UpdateStockLocationDto) {
    const data: Prisma.LocalEstoqueUncheckedCreateInput | Prisma.LocalEstoqueUncheckedUpdateInput = {};
    if (dto.nome !== undefined) {
      const nome = dto.nome.trim();
      if (!nome) throw new BadRequestException('Nome do local é obrigatório');
      data.nome = nome;
    }
    if (dto.codigo !== undefined) {
      const codigo = dto.codigo.trim();
      if (!codigo) throw new BadRequestException('Código do local é obrigatório');
      data.codigo = codigo;
    }
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.obraId !== undefined) data.obraId = dto.obraId || null;
    if (dto.responsavelId !== undefined) data.responsavelId = dto.responsavelId || null;
    if (dto.endereco !== undefined) data.endereco = cleanString(dto.endereco);
    if (dto.permiteSaldoNegativo !== undefined) data.permiteSaldoNegativo = dto.permiteSaldoNegativo;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    return data;
  }

  private async ensureUniqueCode(codigo: string, currentId?: string) {
    const existing = await this.prisma.localEstoque.findFirst({
      where: { codigo, ...(currentId ? { id: { not: currentId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Código de local de estoque já cadastrado');
  }

  private async ensureActiveProject(obraId: string) {
    const obra = await this.prisma.obra.findUnique({ where: { id: obraId } });
    if (!obra || !obra.ativo || obra.status === StatusObra.CANCELADA || obra.status === StatusObra.CONCLUIDA) {
      throw new BadRequestException('Obra ativa não encontrada para vincular ao local de estoque');
    }
  }

  private audit(userId: string, acao: string, registroId: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.logAuditoria.create({
      data: {
        acao,
        tabela: 'locais_estoque',
        registroId,
        valorAntigo: stringifyAudit(oldValue),
        valorNovo: stringifyAudit(newValue),
        motivo: 'Cadastro de local de estoque',
        usuarioId: userId,
      },
    });
  }
}
