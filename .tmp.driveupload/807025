import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  StatusLancamento,
  TipoClassificacaoLancamento,
  TipoCustoLancamento,
  TipoDocumentoEstoque,
  TipoLancamento,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { stringifyAudit } from './stock-common';

@Injectable()
export class StockFinancialIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensurePurchaseTransaction(documentId: string, userId: string) {
    const document = await this.prisma.documentoEstoque.findUnique({
      where: { id: documentId },
      include: {
        fornecedor: true,
        obra: true,
        transacaoFinanceira: true,
        itens: {
          include: {
            material: {
              include: { categoriaMaterial: true },
            },
          },
        },
      },
    });

    if (!document) throw new BadRequestException('Documento de estoque não encontrado');
    if (document.tipo !== TipoDocumentoEstoque.ENTRADA) return document.transacaoFinanceiraId;
    if (document.transacaoFinanceiraId) return document.transacaoFinanceiraId;
    if (!document.fornecedorId) {
      throw new BadRequestException('Entrada de compra exige fornecedor para integração financeira');
    }

    const duplicate = await this.findDuplicatePurchase({
      fornecedorId: document.fornecedorId,
      documentoFiscal: document.documentoFiscal,
      valorTotal: document.valorTotal,
    });

    if (duplicate) {
      await this.prisma.documentoEstoque.update({
        where: { id: document.id },
        data: { transacaoFinanceiraId: duplicate.id },
      });
      await this.audit(userId, 'ESTOQUE_COMPRA_VINCULADA_FINANCEIRO_EXISTENTE', document.id, document, duplicate);
      return duplicate.id;
    }

    const firstItem = document.itens[0];
    const categoriaId = firstItem?.material.categoriaMaterial.categoriaFinanceiraId || null;
    const centroCustoId = firstItem?.material.categoriaMaterial.centroCustoPadraoId || null;
    const descricao = this.buildPurchaseDescription(document);

    const transaction = await this.prisma.lancamentoFinanceiro.create({
      data: {
        descricao,
        valor: document.valorTotal,
        dataVencimento: document.dataDocumento,
        dataCompetencia: document.dataDocumento,
        tipo: TipoLancamento.DESPESA,
        status: StatusLancamento.PREVISTO,
        observacoes: this.buildPurchaseObservation(document),
        fornecedorId: document.fornecedorId,
        obraId: document.obraId,
        categoriaId,
        centroCustoId,
        tipoLancamento: document.obraId
          ? TipoClassificacaoLancamento.OBRA
          : TipoClassificacaoLancamento.ADMINISTRATIVO,
        tipoCusto: TipoCustoLancamento.MATERIAL,
        categoriaCusto: 'MATERIAL_ESTOQUE',
      },
    });

    await this.prisma.documentoEstoque.update({
      where: { id: document.id },
      data: { transacaoFinanceiraId: transaction.id },
    });
    await this.audit(userId, 'ESTOQUE_COMPRA_GEROU_FINANCEIRO', document.id, document, transaction);
    return transaction.id;
  }

  async reversePurchaseLink(documentId: string, userId: string) {
    const document = await this.prisma.documentoEstoque.findUnique({
      where: { id: documentId },
      include: { transacaoFinanceira: true },
    });
    if (!document?.transacaoFinanceiraId) return null;

    const transaction = await this.prisma.lancamentoFinanceiro.update({
      where: { id: document.transacaoFinanceiraId },
      data: {
        status: StatusLancamento.CANCELADO,
        observacoes: `${document.transacaoFinanceira?.observacoes || ''}\nCancelado pelo estorno do documento de estoque ${document.numero}`.trim(),
      },
    });
    await this.audit(userId, 'ESTOQUE_COMPRA_CANCELOU_FINANCEIRO', document.id, document, transaction);
    return transaction;
  }

  async consumptionAppropriations(params: {
    obraId?: string;
    materialId?: string;
    centroCustoId?: string;
    startDate?: string;
    endDate?: string;
    skip?: string;
    take?: string;
  }) {
    const skip = Math.max(0, Number(params.skip) || 0);
    const take = Math.min(Math.max(1, Number(params.take) || 50), 200);
    const where: Prisma.ApropriacaoCustoEstoqueWhereInput = {
      ...(params.obraId ? { obraId: params.obraId } : {}),
      ...(params.materialId ? { materialId: params.materialId } : {}),
      ...(params.centroCustoId ? { centroCustoId: params.centroCustoId } : {}),
      ...(params.startDate && params.endDate
        ? { dataCompetencia: { gte: new Date(params.startDate), lte: new Date(params.endDate) } }
        : {}),
    };

    const [items, total, aggregate] = await this.prisma.$transaction([
      this.prisma.apropriacaoCustoEstoque.findMany({
        where,
        skip,
        take,
        include: {
          obra: true,
          centroCusto: true,
          categoria: true,
          material: true,
          movimentoEstoque: true,
        },
        orderBy: { dataCompetencia: 'desc' },
      }),
      this.prisma.apropriacaoCustoEstoque.count({ where }),
      this.prisma.apropriacaoCustoEstoque.aggregate({ where, _sum: { custoTotal: true, quantidade: true } }),
    ]);

    return {
      items,
      total,
      skip,
      take,
      totalCusto: aggregate._sum.custoTotal || new Prisma.Decimal(0),
      totalQuantidade: aggregate._sum.quantidade || new Prisma.Decimal(0),
    };
  }

  private async findDuplicatePurchase(params: {
    fornecedorId: string;
    documentoFiscal?: string | null;
    valorTotal: Prisma.Decimal;
  }) {
    if (!params.documentoFiscal) return null;
    return this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        tipo: TipoLancamento.DESPESA,
        fornecedorId: params.fornecedorId,
        valor: params.valorTotal,
        observacoes: { contains: `NF: ${params.documentoFiscal}`, mode: 'insensitive' },
        status: { not: StatusLancamento.CANCELADO },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private buildPurchaseDescription(document: any) {
    const supplier = document.fornecedor?.nomeFantasia || document.fornecedor?.razaoSocial || 'Fornecedor';
    const fiscal = document.documentoFiscal ? ` NF ${document.documentoFiscal}` : '';
    return `Compra de materiais - ${supplier}${fiscal}`;
  }

  private buildPurchaseObservation(document: any) {
    const parts = [`Origem: estoque`, `Documento estoque: ${document.numero}`];
    if (document.documentoFiscal) parts.push(`NF: ${document.documentoFiscal}`);
    if (document.observacao) parts.push(document.observacao);
    return parts.join(' | ');
  }

  private audit(userId: string, acao: string, registroId: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.logAuditoria.create({
      data: {
        acao,
        tabela: 'documentos_estoque',
        registroId,
        valorAntigo: stringifyAudit(oldValue),
        valorNovo: stringifyAudit(newValue),
        motivo: 'Integração estoque-financeiro',
        usuarioId: userId,
      },
    });
  }
}
