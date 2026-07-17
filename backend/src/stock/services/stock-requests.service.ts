import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  StatusReservaEstoque,
  StatusSolicitacaoMaterial,
  TipoMovimentoEstoque,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApproveStockRequestDto } from '../dto/approve-stock-request.dto';
import { CreateStockRequestDto } from '../dto/create-stock-request.dto';
import { FulfillStockRequestDto } from '../dto/fulfill-stock-request.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { normalizePagination, stringifyAudit } from './stock-common';
import { StockMovementService } from './stock-movement.service';

@Injectable()
export class StockRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementService: StockMovementService,
  ) {}

  async create(dto: CreateStockRequestDto, userId: string) {
    await this.ensureActiveProject(dto.obraId);
    const numero = await this.nextRequestNumber();
    const items = dto.items.map((item) => {
      const quantidade = new Prisma.Decimal(item.quantidadeSolicitada);
      if (quantidade.lte(0)) throw new BadRequestException('Quantidade solicitada deve ser maior que zero');
      return {
        materialId: item.materialId,
        quantidadeSolicitada: quantidade,
        observacao: item.observacao?.trim() || null,
      };
    });

    const request = await this.prisma.solicitacaoMaterial.create({
      data: {
        numero,
        obraId: dto.obraId,
        localDestinoId: dto.localDestinoId,
        solicitanteId: userId,
        prioridade: dto.prioridade,
        dataNecessidade: dto.dataNecessidade ? new Date(dto.dataNecessidade) : null,
        justificativa: dto.justificativa?.trim() || null,
        observacao: dto.observacao?.trim() || null,
        itens: { create: items },
      },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_SOLICITACAO_CRIADA', request.id, null, request);
    return request;
  }

  async findAll(query: PaginationQueryDto & { status?: StatusSolicitacaoMaterial; obraId?: string }) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.SolicitacaoMaterialWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.obraId ? { obraId: query.obraId } : {}),
      ...(query.search
        ? {
            OR: [
              { numero: { contains: query.search, mode: 'insensitive' } },
              { justificativa: { contains: query.search, mode: 'insensitive' } },
              { observacao: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.solicitacaoMaterial.findMany({
        where,
        skip,
        take,
        include: this.includeRelations(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.solicitacaoMaterial.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const request = await this.prisma.solicitacaoMaterial.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!request) throw new NotFoundException('Solicitação de material não encontrada');
    return request;
  }

  async submit(id: string, userId: string) {
    const current = await this.findOne(id);
    if (current.status !== StatusSolicitacaoMaterial.RASCUNHO) {
      throw new BadRequestException('Somente rascunhos podem ser enviados');
    }
    const updated = await this.prisma.solicitacaoMaterial.update({
      where: { id },
      data: { status: StatusSolicitacaoMaterial.ENVIADA },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_SOLICITACAO_ENVIADA', id, current, updated);
    return updated;
  }

  async approve(id: string, dto: ApproveStockRequestDto, userId: string) {
    const request = await this.findOne(id);
    if (request.status !== StatusSolicitacaoMaterial.ENVIADA && request.status !== StatusSolicitacaoMaterial.EM_ANALISE && request.status !== StatusSolicitacaoMaterial.RASCUNHO) {
      throw new BadRequestException('Solicitação não pode ser aprovada no status atual');
    }
    const approvals = new Map(dto.items.map((item) => [item.itemId, new Prisma.Decimal(item.quantidadeAprovada)]));

    return this.prisma.$transaction(async (tx) => {
      let approvedCount = 0;
      for (const item of request.itens) {
        const approved = approvals.get(item.id) || new Prisma.Decimal(0);
        if (approved.lt(0)) throw new BadRequestException('Quantidade aprovada não pode ser negativa');
        if (approved.gt(item.quantidadeSolicitada)) throw new BadRequestException('Quantidade aprovada não pode exceder solicitada');
        await tx.itemSolicitacaoMaterial.update({
          where: { id: item.id },
          data: { quantidadeAprovada: approved },
        });
        if (approved.gt(0)) {
          approvedCount++;
          await this.reserveStock(tx, {
            materialId: item.materialId,
            localEstoqueId: dto.localReservaId,
            obraId: request.obraId,
            quantidade: approved,
            finalidade: `Solicitação ${request.numero}`,
            solicitadoPorId: request.solicitanteId,
            aprovadoPorId: userId,
            dataNecessidade: request.dataNecessidade,
          });
        }
      }

      const status =
        approvedCount === 0
          ? StatusSolicitacaoMaterial.REJEITADA
          : approvedCount === request.itens.length
            ? StatusSolicitacaoMaterial.APROVADA
            : StatusSolicitacaoMaterial.PARCIALMENTE_APROVADA;

      const updated = await tx.solicitacaoMaterial.update({
        where: { id },
        data: { status, aprovadorId: userId, observacao: dto.observacao || request.observacao },
        include: this.includeRelations(),
      });
      await tx.logAuditoria.create({
        data: {
          acao: 'ESTOQUE_SOLICITACAO_APROVADA',
          tabela: 'solicitacoes_material',
          registroId: id,
          valorAntigo: stringifyAudit(request),
          valorNovo: stringifyAudit(updated),
          motivo: 'Aprovação e reserva de solicitação de material',
          usuarioId: userId,
        },
      });
      return updated;
    });
  }

  async reject(id: string, motivo: string, userId: string) {
    if (!motivo?.trim()) throw new BadRequestException('Motivo da rejeição é obrigatório');
    const current = await this.findOne(id);
    const updated = await this.prisma.solicitacaoMaterial.update({
      where: { id },
      data: { status: StatusSolicitacaoMaterial.REJEITADA, aprovadorId: userId, observacao: motivo },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_SOLICITACAO_REJEITADA', id, current, updated);
    return updated;
  }

  async fulfill(id: string, dto: FulfillStockRequestDto, userId: string) {
    const request = await this.findOne(id);
    if (request.status !== StatusSolicitacaoMaterial.APROVADA && request.status !== StatusSolicitacaoMaterial.PARCIALMENTE_APROVADA && request.status !== StatusSolicitacaoMaterial.SEPARACAO) {
      throw new BadRequestException('Solicitação não pode ser atendida no status atual');
    }

    const movements: any[] = [];
    for (const item of request.itens) {
      const approved = item.quantidadeAprovada || new Prisma.Decimal(0);
      const remaining = approved.minus(item.quantidadeAtendida);
      if (remaining.lte(0)) continue;
      const movement = await this.movementService.execute(
        {
          tipo: request.localDestinoId ? TipoMovimentoEstoque.TRANSFERENCIA : TipoMovimentoEstoque.SAIDA_CONSUMO,
          materialId: item.materialId,
          localOrigemId: dto.localOrigemId,
          localDestinoId: request.localDestinoId || undefined,
          obraId: request.obraId,
          quantidade: remaining.toString(),
          unidade: item.material.unidade,
          documentoTipo: 'SOLICITACAO_MATERIAL',
          documentoNumero: request.numero,
          observacao: dto.observacao || request.observacao || undefined,
        },
        userId,
      );
      movements.push(movement);
      await this.prisma.itemSolicitacaoMaterial.update({
        where: { id: item.id },
        data: { quantidadeAtendida: approved },
      });
      await this.releaseReservations(item.materialId, dto.localOrigemId, remaining);
    }

    const refreshed = await this.prisma.solicitacaoMaterial.findUnique({ where: { id }, include: { itens: true } });
    const allFulfilled = refreshed?.itens.every((item) => (item.quantidadeAprovada || new Prisma.Decimal(0)).lte(item.quantidadeAtendida));
    const updated = await this.prisma.solicitacaoMaterial.update({
      where: { id },
      data: { status: allFulfilled ? StatusSolicitacaoMaterial.ATENDIDA : StatusSolicitacaoMaterial.PARCIALMENTE_ATENDIDA },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_SOLICITACAO_ATENDIDA', id, request, updated);
    return { request: updated, movements };
  }

  async cancel(id: string, userId: string) {
    const current = await this.findOne(id);
    const updated = await this.prisma.solicitacaoMaterial.update({
      where: { id },
      data: { status: StatusSolicitacaoMaterial.CANCELADA },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_SOLICITACAO_CANCELADA', id, current, updated);
    return updated;
  }

  async reservations(query: PaginationQueryDto & { status?: StatusReservaEstoque; obraId?: string; materialId?: string }) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.ReservaEstoqueWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.obraId ? { obraId: query.obraId } : {}),
      ...(query.materialId ? { materialId: query.materialId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.reservaEstoque.findMany({
        where,
        skip,
        take,
        include: { material: true, localEstoque: true, obra: true, solicitadoPor: true, aprovadoPor: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reservaEstoque.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  private async reserveStock(tx: Prisma.TransactionClient, data: {
    materialId: string;
    localEstoqueId: string;
    obraId: string;
    quantidade: Prisma.Decimal;
    finalidade: string;
    solicitadoPorId: string;
    aprovadoPorId: string;
    dataNecessidade: Date | null;
  }) {
    await tx.saldoEstoque.upsert({
      where: { materialId_localEstoqueId: { materialId: data.materialId, localEstoqueId: data.localEstoqueId } },
      create: {
        materialId: data.materialId,
        localEstoqueId: data.localEstoqueId,
        quantidadeReservada: data.quantidade,
      },
      update: { quantidadeReservada: { increment: data.quantidade } },
    });
    await tx.reservaEstoque.create({
      data: {
        materialId: data.materialId,
        localEstoqueId: data.localEstoqueId,
        obraId: data.obraId,
        quantidade: data.quantidade,
        status: StatusReservaEstoque.APROVADA,
        finalidade: data.finalidade,
        solicitadoPorId: data.solicitadoPorId,
        aprovadoPorId: data.aprovadoPorId,
        dataNecessidade: data.dataNecessidade,
      },
    });
  }

  private async releaseReservations(materialId: string, localEstoqueId: string, quantity: Prisma.Decimal) {
    await this.prisma.saldoEstoque.update({
      where: { materialId_localEstoqueId: { materialId, localEstoqueId } },
      data: { quantidadeReservada: { decrement: quantity } },
    });
    const reservations = await this.prisma.reservaEstoque.findMany({
      where: { materialId, localEstoqueId, status: StatusReservaEstoque.APROVADA },
      orderBy: { createdAt: 'asc' },
    });
    let remaining = quantity;
    for (const reservation of reservations) {
      if (remaining.lte(0)) break;
      if (new Prisma.Decimal(reservation.quantidade).lte(remaining)) {
        remaining = remaining.minus(reservation.quantidade);
        await this.prisma.reservaEstoque.update({ where: { id: reservation.id }, data: { status: StatusReservaEstoque.ATENDIDA } });
      }
    }
  }

  private includeRelations() {
    return {
      obra: true,
      localDestino: true,
      solicitante: { select: { id: true, nome: true, email: true } },
      aprovador: { select: { id: true, nome: true, email: true } },
      itens: { include: { material: true }, orderBy: { material: { nome: 'asc' } } as any },
    };
  }

  private async ensureActiveProject(obraId: string) {
    const obra = await this.prisma.obra.findUnique({ where: { id: obraId } });
    if (!obra || !obra.ativo) throw new BadRequestException('Obra ativa não encontrada');
  }

  private async nextRequestNumber() {
    const count = await this.prisma.solicitacaoMaterial.count();
    return `SOL-${String(count + 1).padStart(8, '0')}`;
  }

  private audit(userId: string, acao: string, registroId: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.logAuditoria.create({
      data: {
        acao,
        tabela: 'solicitacoes_material',
        registroId,
        valorAntigo: stringifyAudit(oldValue),
        valorNovo: stringifyAudit(newValue),
        motivo: 'Fluxo de solicitação de material',
        usuarioId: userId,
      },
    });
  }
}
