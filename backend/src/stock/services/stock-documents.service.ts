import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  StatusDocumentoEstoque,
  TipoDocumentoEstoque,
  TipoMovimentoEstoque,
  UnidadeMedidaMaterial,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockDocumentDto } from '../dto/create-stock-document.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { StockMovementService } from './stock-movement.service';
import { StockFinancialIntegrationService } from './stock-financial-integration.service';
import { normalizePagination, stringifyAudit } from './stock-common';

@Injectable()
export class StockDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementService: StockMovementService,
    private readonly financialIntegration: StockFinancialIntegrationService,
  ) {}

  async create(tipo: TipoDocumentoEstoque, dto: CreateStockDocumentDto, userId: string) {
    this.validateDocumentShape(tipo, dto);
    const numero = dto.numero?.trim() || (await this.nextDocumentNumber(tipo));

    const items = await Promise.all(
      dto.items.map(async (item) => {
        const material = await this.prisma.material.findUnique({ where: { id: item.materialId } });
        if (!material || !material.ativo) throw new BadRequestException('Material ativo não encontrado no documento');
        const quantidade = new Prisma.Decimal(item.quantidade);
        if (quantidade.lte(0)) throw new BadRequestException('Quantidade do item deve ser maior que zero');
        const custoUnitario = item.custoUnitario ? new Prisma.Decimal(item.custoUnitario) : new Prisma.Decimal(0);
        if (custoUnitario.lt(0)) throw new BadRequestException('Custo unitário não pode ser negativo');
        return {
          materialId: item.materialId,
          quantidade,
          custoUnitario,
          custoTotal: quantidade.mul(custoUnitario),
          lote: item.lote?.trim() || null,
          dataValidade: item.dataValidade ? new Date(item.dataValidade) : null,
          observacao: item.observacao?.trim() || null,
        };
      }),
    );

    const valorTotal = items.reduce((acc, item) => acc.plus(item.custoTotal), new Prisma.Decimal(0));

    const document = await this.prisma.documentoEstoque.create({
      data: {
        numero,
        tipo,
        status: StatusDocumentoEstoque.RASCUNHO,
        fornecedorId: dto.fornecedorId,
        obraId: dto.obraId,
        localOrigemId: dto.localOrigemId,
        localDestinoId: dto.localDestinoId,
        dataDocumento: dto.dataDocumento ? new Date(dto.dataDocumento) : new Date(),
        documentoFiscal: dto.documentoFiscal?.trim() || null,
        valorTotal,
        observacao: dto.observacao?.trim() || null,
        transacaoFinanceiraId: dto.transacaoFinanceiraId,
        criadoPorId: userId,
        itens: { create: items },
      },
      include: this.includeRelations(),
    });

    await this.audit(userId, 'ESTOQUE_DOCUMENTO_CRIADO', document.id, null, document);
    return document;
  }

  async findAll(tipo: TipoDocumentoEstoque, query: PaginationQueryDto) {
    const { skip, take } = normalizePagination(query.skip, query.take);
    const where: Prisma.DocumentoEstoqueWhereInput = {
      tipo,
      ...(query.search
        ? {
            OR: [
              { numero: { contains: query.search, mode: 'insensitive' } },
              { documentoFiscal: { contains: query.search, mode: 'insensitive' } },
              { observacao: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentoEstoque.findMany({
        where,
        skip,
        take,
        include: this.includeRelations(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentoEstoque.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const document = await this.prisma.documentoEstoque.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!document) throw new NotFoundException('Documento de estoque não encontrado');
    return document;
  }

  async submit(id: string, userId: string) {
    const document = await this.ensureMutable(id);
    const updated = await this.prisma.documentoEstoque.update({
      where: { id },
      data: { status: StatusDocumentoEstoque.PENDENTE_APROVACAO },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_DOCUMENTO_ENVIADO_APROVACAO', id, document, updated);
    return updated;
  }

  async approve(id: string, userId: string) {
    const document = await this.findOne(id);
    if (document.status !== StatusDocumentoEstoque.RASCUNHO && document.status !== StatusDocumentoEstoque.PENDENTE_APROVACAO) {
      throw new BadRequestException('Documento não pode ser aprovado no status atual');
    }
    const updated = await this.prisma.documentoEstoque.update({
      where: { id },
      data: { status: StatusDocumentoEstoque.APROVADO, aprovadoPorId: userId },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_DOCUMENTO_APROVADO', id, document, updated);
    return updated;
  }

  async post(id: string, userId: string) {
    const document = await this.findOne(id);
    if (document.status !== StatusDocumentoEstoque.RASCUNHO && document.status !== StatusDocumentoEstoque.APROVADO) {
      throw new BadRequestException('Documento não pode ser efetivado no status atual');
    }
    if (!document.itens.length) throw new BadRequestException('Documento sem itens não pode ser efetivado');

    const transacaoFinanceiraId =
      document.tipo === TipoDocumentoEstoque.ENTRADA
        ? await this.financialIntegration.ensurePurchaseTransaction(document.id, userId)
        : document.transacaoFinanceiraId;

    const movements: any[] = [];
    for (const item of document.itens) {
      const tipoMovimento = this.mapMovementType(document.tipo);
      const movement = await this.movementService.execute(
        {
          tipo: tipoMovimento,
          materialId: item.materialId,
          localOrigemId: document.localOrigemId || undefined,
          localDestinoId: document.localDestinoId || undefined,
          obraId: document.obraId || undefined,
          fornecedorId: document.fornecedorId || undefined,
          quantidade: item.quantidade.toString(),
          unidade: item.material.unidade as UnidadeMedidaMaterial,
          custoUnitario: item.custoUnitario.toString(),
          documentoTipo: document.tipo,
          documentoNumero: document.numero,
          notaFiscalNumero: document.documentoFiscal || undefined,
          observacao: item.observacao || document.observacao || undefined,
          dataMovimento: document.dataDocumento.toISOString(),
        },
        userId,
      );
      await this.prisma.movimentoEstoque.update({
        where: { id: movement.id },
        data: { documentoEstoqueId: document.id, transacaoFinanceiraId },
      });
      movements.push(movement);
    }

    const updated = await this.prisma.documentoEstoque.update({
      where: { id },
      data: { status: StatusDocumentoEstoque.EFETIVADO, efetivadoPorId: userId },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_DOCUMENTO_EFETIVADO', id, document, updated);
    return { document: updated, movements };
  }

  async cancel(id: string, userId: string, motivo: string) {
    if (!motivo?.trim()) throw new BadRequestException('Motivo do cancelamento é obrigatório');
    const document = await this.findOne(id);

    if (document.status === StatusDocumentoEstoque.EFETIVADO) {
      const reversed: any[] = [];
      for (const movement of document.movimentos) {
        reversed.push(await this.movementService.reverse(movement.id, userId, motivo));
      }
      const updated = await this.prisma.documentoEstoque.update({
        where: { id },
        data: { status: StatusDocumentoEstoque.ESTORNADO },
        include: this.includeRelations(),
      });
      await this.financialIntegration.reversePurchaseLink(document.id, userId);
      await this.audit(userId, 'ESTOQUE_DOCUMENTO_ESTORNADO', id, document, updated);
      return { document: updated, reversed };
    }

    if (document.status === StatusDocumentoEstoque.CANCELADO || document.status === StatusDocumentoEstoque.ESTORNADO) {
      throw new BadRequestException('Documento já cancelado ou estornado');
    }

    const updated = await this.prisma.documentoEstoque.update({
      where: { id },
      data: { status: StatusDocumentoEstoque.CANCELADO },
      include: this.includeRelations(),
    });
    await this.audit(userId, 'ESTOQUE_DOCUMENTO_CANCELADO', id, document, updated);
    return { document: updated, reversed: [] };
  }

  private validateDocumentShape(tipo: TipoDocumentoEstoque, dto: CreateStockDocumentDto) {
    if (tipo === TipoDocumentoEstoque.ENTRADA && !dto.localDestinoId) throw new BadRequestException('Entrada exige local de destino');
    if (tipo === TipoDocumentoEstoque.SAIDA && !dto.localOrigemId) throw new BadRequestException('Saída exige local de origem');
    if (tipo === TipoDocumentoEstoque.TRANSFERENCIA) {
      if (!dto.localOrigemId || !dto.localDestinoId) throw new BadRequestException('Transferência exige origem e destino');
      if (dto.localOrigemId === dto.localDestinoId) throw new BadRequestException('Origem e destino devem ser diferentes');
    }
  }

  private mapMovementType(tipo: TipoDocumentoEstoque) {
    if (tipo === TipoDocumentoEstoque.ENTRADA) return TipoMovimentoEstoque.ENTRADA_COMPRA;
    if (tipo === TipoDocumentoEstoque.SAIDA) return TipoMovimentoEstoque.SAIDA_CONSUMO;
    if (tipo === TipoDocumentoEstoque.TRANSFERENCIA) return TipoMovimentoEstoque.TRANSFERENCIA;
    throw new BadRequestException('Tipo de documento ainda não suportado para efetivação');
  }

  private async ensureMutable(id: string) {
    const document = await this.findOne(id);
    if (document.status !== StatusDocumentoEstoque.RASCUNHO) {
      throw new BadRequestException('Documento não pode ser alterado no status atual');
    }
    return document;
  }

  private async nextDocumentNumber(tipo: TipoDocumentoEstoque) {
    const count = await this.prisma.documentoEstoque.count({ where: { tipo } });
    const prefix = tipo === TipoDocumentoEstoque.ENTRADA ? 'ENT' : tipo === TipoDocumentoEstoque.SAIDA ? 'SAI' : 'TRA';
    return `${prefix}-${String(count + 1).padStart(8, '0')}`;
  }

  private includeRelations() {
    return {
      fornecedor: true,
      obra: true,
      localOrigem: true,
      localDestino: true,
      transacaoFinanceira: true,
      criadoPor: { select: { id: true, nome: true, email: true } },
      aprovadoPor: { select: { id: true, nome: true, email: true } },
      efetivadoPor: { select: { id: true, nome: true, email: true } },
      itens: { include: { material: true }, orderBy: { material: { nome: 'asc' } } as any },
      movimentos: true,
    };
  }

  private audit(userId: string, acao: string, registroId: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.logAuditoria.create({
      data: {
        acao,
        tabela: 'documentos_estoque',
        registroId,
        valorAntigo: stringifyAudit(oldValue),
        valorNovo: stringifyAudit(newValue),
        motivo: 'Fluxo de documento de estoque',
        usuarioId: userId,
      },
    });
  }
}
