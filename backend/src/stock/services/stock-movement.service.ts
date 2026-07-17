import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusMovimentoEstoque,
  TipoMovimentoEstoque,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { ExecuteStockMovementDto } from '../dto/execute-stock-movement.dto';
import { StockCostingService } from './stock-costing.service';

type Tx = Prisma.TransactionClient;

const ENTRY_TYPES = new Set<TipoMovimentoEstoque>([
  TipoMovimentoEstoque.ENTRADA_COMPRA,
  TipoMovimentoEstoque.ENTRADA_DEVOLUCAO,
  TipoMovimentoEstoque.ENTRADA_DOACAO,
  TipoMovimentoEstoque.ENTRADA_AJUSTE,
]);

const ISSUE_TYPES = new Set<TipoMovimentoEstoque>([
  TipoMovimentoEstoque.SAIDA_CONSUMO,
  TipoMovimentoEstoque.SAIDA_PERDA,
  TipoMovimentoEstoque.SAIDA_DEVOLUCAO_FORNECEDOR,
  TipoMovimentoEstoque.SAIDA_AJUSTE,
]);

@Injectable()
export class StockMovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costing: StockCostingService,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: ExecuteStockMovementDto, userId: string) {
    if (process.env.STOCK_MODULE_ENABLED !== 'true') {
      throw new ForbiddenException('Módulo de estoque desativado');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const material = await tx.material.findUnique({
          where: { id: dto.materialId },
          include: { categoriaMaterial: true },
        });
        if (!material || !material.ativo) {
          throw new NotFoundException('Material ativo não encontrado');
        }

        if (dto.unidade !== material.unidade) {
          throw new BadRequestException(
            'Unidade do movimento difere da unidade do material',
          );
        }

        const quantidade = this.costing.assertPositive(
          dto.quantidade,
          'quantidade',
        );

        if (dto.localOrigemId && dto.localDestinoId && dto.localOrigemId === dto.localDestinoId) {
          throw new BadRequestException('Local de origem deve ser diferente do destino');
        }

        const numero = await this.nextMovementNumber(tx);
        const dataMovimento = dto.dataMovimento
          ? new Date(dto.dataMovimento)
          : new Date();

        if (ENTRY_TYPES.has(dto.tipo)) {
          if (!dto.localDestinoId) {
            throw new BadRequestException('Entrada exige local de destino');
          }
          return this.applyEntry(tx, dto, userId, numero, dataMovimento, quantidade);
        }

        if (ISSUE_TYPES.has(dto.tipo)) {
          if (!dto.localOrigemId) {
            throw new BadRequestException('Saída exige local de origem');
          }
          return this.applyIssue(tx, dto, userId, numero, dataMovimento, quantidade);
        }

        if (dto.tipo === TipoMovimentoEstoque.TRANSFERENCIA) {
          if (!dto.localOrigemId || !dto.localDestinoId) {
            throw new BadRequestException('Transferência exige origem e destino');
          }
          return this.applyTransfer(tx, dto, userId, numero, dataMovimento, quantidade);
        }

        throw new BadRequestException('Tipo de movimento ainda não suportado pelo serviço central');
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }



  async reverse(movementId: string, userId: string, motivo: string) {
    if (process.env.STOCK_MODULE_ENABLED !== 'true') {
      throw new ForbiddenException('Módulo de estoque desativado');
    }
    if (!motivo?.trim()) {
      throw new BadRequestException('Motivo do estorno é obrigatório');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const original = await tx.movimentoEstoque.findUnique({
          where: { id: movementId },
          include: { material: true },
        });
        if (!original) throw new NotFoundException('Movimento de estoque não encontrado');
        if (original.status !== StatusMovimentoEstoque.EFETIVADO) {
          throw new BadRequestException('Somente movimentos efetivados podem ser estornados');
        }
        const alreadyReversed = await tx.movimentoEstoque.findFirst({
          where: { movimentoRelacionadoId: original.id, tipo: TipoMovimentoEstoque.ESTORNO },
          select: { id: true },
        });
        if (alreadyReversed) throw new BadRequestException('Movimento já possui estorno');

        const numero = await this.nextMovementNumber(tx);
        const quantidade = new Prisma.Decimal(original.quantidade);
        const custoUnitario = new Prisma.Decimal(original.custoUnitario);
        const custoTotal = quantidade.mul(custoUnitario);
        let saldoAnteriorOrigem: Prisma.Decimal | undefined;
        let saldoPosteriorOrigem: Prisma.Decimal | undefined;
        let saldoAnteriorDestino: Prisma.Decimal | undefined;
        let saldoPosteriorDestino: Prisma.Decimal | undefined;

        if (original.localDestinoId && !original.localOrigemId) {
          const saldo = await this.getOrCreateLockedBalance(tx, original.materialId, original.localDestinoId);
          saldoAnteriorDestino = saldo.quantidade;
          saldoPosteriorDestino = saldo.quantidade.minus(quantidade);
          await tx.saldoEstoque.update({
            where: { id: saldo.id },
            data: {
              quantidade: saldoPosteriorDestino,
              valorTotal: saldoPosteriorDestino.mul(saldo.custoMedio),
            },
          });
        } else if (original.localOrigemId && !original.localDestinoId) {
          const saldo = await this.getOrCreateLockedBalance(tx, original.materialId, original.localOrigemId);
          saldoAnteriorOrigem = saldo.quantidade;
          saldoPosteriorOrigem = saldo.quantidade.plus(quantidade);
          const novoCustoMedio = this.costing.calculateMovingAverageCost({
            currentQuantity: saldo.quantidade,
            currentAverageCost: saldo.custoMedio,
            incomingQuantity: quantidade,
            incomingUnitCost: custoUnitario,
          });
          await tx.saldoEstoque.update({
            where: { id: saldo.id },
            data: {
              quantidade: saldoPosteriorOrigem,
              custoMedio: novoCustoMedio,
              valorTotal: saldoPosteriorOrigem.mul(novoCustoMedio),
            },
          });
        } else if (original.localOrigemId && original.localDestinoId) {
          const origem = await this.getOrCreateLockedBalance(tx, original.materialId, original.localOrigemId);
          const destino = await this.getOrCreateLockedBalance(tx, original.materialId, original.localDestinoId);
          saldoAnteriorOrigem = origem.quantidade;
          saldoAnteriorDestino = destino.quantidade;
          saldoPosteriorOrigem = origem.quantidade.plus(quantidade);
          saldoPosteriorDestino = destino.quantidade.minus(quantidade);
          await tx.saldoEstoque.update({
            where: { id: origem.id },
            data: {
              quantidade: saldoPosteriorOrigem,
              valorTotal: saldoPosteriorOrigem.mul(origem.custoMedio),
            },
          });
          await tx.saldoEstoque.update({
            where: { id: destino.id },
            data: {
              quantidade: saldoPosteriorDestino,
              valorTotal: saldoPosteriorDestino.mul(destino.custoMedio),
            },
          });
        } else {
          throw new BadRequestException('Movimento original sem local para estorno');
        }

        const reversal = await tx.movimentoEstoque.create({
          data: {
            numero,
            tipo: TipoMovimentoEstoque.ESTORNO,
            status: StatusMovimentoEstoque.EFETIVADO,
            materialId: original.materialId,
            localOrigemId: original.localDestinoId,
            localDestinoId: original.localOrigemId,
            obraId: original.obraId,
            fornecedorId: original.fornecedorId,
            quantidade,
            unidade: original.unidade,
            custoUnitario,
            custoTotal,
            saldoAnteriorOrigem,
            saldoPosteriorOrigem,
            saldoAnteriorDestino,
            saldoPosteriorDestino,
            dataMovimento: new Date(),
            documentoTipo: original.documentoTipo,
            documentoNumero: original.documentoNumero,
            notaFiscalNumero: original.notaFiscalNumero,
            notaFiscalChave: original.notaFiscalChave,
            observacao: `Estorno: ${motivo}`,
            movimentoRelacionadoId: original.id,
            documentoEstoqueId: original.documentoEstoqueId,
            transacaoFinanceiraId: original.transacaoFinanceiraId,
            registradoPorId: userId,
          },
        });

        await tx.movimentoEstoque.update({
          where: { id: original.id },
          data: {
            status: StatusMovimentoEstoque.ESTORNADO,
            canceladoPorId: userId,
            motivoCancelamento: motivo,
          },
        });

        await tx.apropriacaoCustoEstoque.deleteMany({ where: { movimentoEstoqueId: original.id } });
        await this.createAudit(tx, userId, 'ESTOQUE_MOVIMENTO_ESTORNADO', reversal.id, original, reversal);
        return reversal;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async applyEntry(
    tx: Tx,
    dto: ExecuteStockMovementDto,
    userId: string,
    numero: string,
    dataMovimento: Date,
    quantidade: Prisma.Decimal,
  ) {
    const destino = await this.getActiveLocation(tx, dto.localDestinoId!);
    const custoUnitario = this.costing.assertNonNegative(
      dto.custoUnitario ?? 0,
      'custo unitário',
    );
    const saldoDestino = await this.getOrCreateLockedBalance(
      tx,
      dto.materialId,
      destino.id,
    );

    const novoCustoMedio = this.costing.calculateMovingAverageCost({
      currentQuantity: saldoDestino.quantidade,
      currentAverageCost: saldoDestino.custoMedio,
      incomingQuantity: quantidade,
      incomingUnitCost: custoUnitario,
    });
    const quantidadePosterior = saldoDestino.quantidade.plus(quantidade);
    const valorTotal = quantidadePosterior.mul(novoCustoMedio);

    await tx.saldoEstoque.update({
      where: { id: saldoDestino.id },
      data: {
        quantidade: quantidadePosterior,
        custoMedio: novoCustoMedio,
        valorTotal,
      },
    });

    await tx.material.update({
      where: { id: dto.materialId },
      data: { ultimoCusto: custoUnitario, custoMedio: novoCustoMedio },
    });

    const movimento = await tx.movimentoEstoque.create({
      data: {
        numero,
        tipo: dto.tipo,
        status: StatusMovimentoEstoque.EFETIVADO,
        materialId: dto.materialId,
        localDestinoId: destino.id,
        obraId: dto.obraId,
        fornecedorId: dto.fornecedorId,
        quantidade,
        unidade: dto.unidade,
        custoUnitario,
        custoTotal: quantidade.mul(custoUnitario),
        saldoAnteriorDestino: saldoDestino.quantidade,
        saldoPosteriorDestino: quantidadePosterior,
        dataMovimento,
        documentoTipo: dto.documentoTipo,
        documentoNumero: dto.documentoNumero,
        notaFiscalNumero: dto.notaFiscalNumero,
        notaFiscalChave: dto.notaFiscalChave,
        observacao: dto.observacao,
        registradoPorId: userId,
      },
    });

    await this.createAudit(tx, userId, 'ESTOQUE_ENTRADA_EFETIVADA', movimento.id, null, movimento);
    return movimento;
  }

  private async applyIssue(
    tx: Tx,
    dto: ExecuteStockMovementDto,
    userId: string,
    numero: string,
    dataMovimento: Date,
    quantidade: Prisma.Decimal,
  ) {
    const origem = await this.getActiveLocation(tx, dto.localOrigemId!);
    const saldoOrigem = await this.getOrCreateLockedBalance(
      tx,
      dto.materialId,
      origem.id,
    );
    const disponivel = saldoOrigem.quantidade.minus(saldoOrigem.quantidadeReservada);
    const saldoPosterior = saldoOrigem.quantidade.minus(quantidade);

    if (disponivel.lt(quantidade)) {
      const canNegative = origem.permiteSaldoNegativo && dto.permitirSaldoNegativo;
      if (!canNegative || !dto.justificativaSaldoNegativo) {
        throw new BadRequestException('Saldo disponível insuficiente');
      }
      await this.createAudit(
        tx,
        userId,
        'ESTOQUE_TENTATIVA_SALDO_NEGATIVO',
        saldoOrigem.id,
        saldoOrigem,
        { quantidade, disponivel, justificativa: dto.justificativaSaldoNegativo },
      );
    }

    const custoUnitario = saldoOrigem.custoMedio;
    const custoTotal = quantidade.mul(custoUnitario);

    await tx.saldoEstoque.update({
      where: { id: saldoOrigem.id },
      data: {
        quantidade: saldoPosterior,
        valorTotal: saldoPosterior.mul(custoUnitario),
      },
    });

    const movimento = await tx.movimentoEstoque.create({
      data: {
        numero,
        tipo: dto.tipo,
        status: StatusMovimentoEstoque.EFETIVADO,
        materialId: dto.materialId,
        localOrigemId: origem.id,
        obraId: dto.obraId,
        fornecedorId: dto.fornecedorId,
        quantidade,
        unidade: dto.unidade,
        custoUnitario,
        custoTotal,
        saldoAnteriorOrigem: saldoOrigem.quantidade,
        saldoPosteriorOrigem: saldoPosterior,
        dataMovimento,
        documentoTipo: dto.documentoTipo,
        documentoNumero: dto.documentoNumero,
        notaFiscalNumero: dto.notaFiscalNumero,
        notaFiscalChave: dto.notaFiscalChave,
        observacao: dto.observacao,
        registradoPorId: userId,
      },
    });

    if (
      (dto.tipo === TipoMovimentoEstoque.SAIDA_CONSUMO ||
        dto.tipo === TipoMovimentoEstoque.SAIDA_PERDA) &&
      dto.obraId
    ) {
      await this.createCostAppropriation(tx, movimento.id, dto.materialId, dto.obraId, quantidade, custoUnitario, custoTotal, dataMovimento);
    }

    await this.createAudit(tx, userId, 'ESTOQUE_SAIDA_EFETIVADA', movimento.id, saldoOrigem, movimento);
    return movimento;
  }

  private async applyTransfer(
    tx: Tx,
    dto: ExecuteStockMovementDto,
    userId: string,
    numero: string,
    dataMovimento: Date,
    quantidade: Prisma.Decimal,
  ) {
    const origem = await this.getActiveLocation(tx, dto.localOrigemId!);
    const destino = await this.getActiveLocation(tx, dto.localDestinoId!);
    const saldoOrigem = await this.getOrCreateLockedBalance(tx, dto.materialId, origem.id);
    const saldoDestino = await this.getOrCreateLockedBalance(tx, dto.materialId, destino.id);
    const disponivel = saldoOrigem.quantidade.minus(saldoOrigem.quantidadeReservada);

    if (disponivel.lt(quantidade)) {
      throw new BadRequestException('Saldo disponível insuficiente para transferência');
    }

    const custoUnitario = saldoOrigem.custoMedio;
    const custoTotal = quantidade.mul(custoUnitario);
    const origemPosterior = saldoOrigem.quantidade.minus(quantidade);
    const destinoPosterior = saldoDestino.quantidade.plus(quantidade);
    const destinoCustoMedio = this.costing.calculateMovingAverageCost({
      currentQuantity: saldoDestino.quantidade,
      currentAverageCost: saldoDestino.custoMedio,
      incomingQuantity: quantidade,
      incomingUnitCost: custoUnitario,
    });

    await tx.saldoEstoque.update({
      where: { id: saldoOrigem.id },
      data: {
        quantidade: origemPosterior,
        valorTotal: origemPosterior.mul(custoUnitario),
      },
    });
    await tx.saldoEstoque.update({
      where: { id: saldoDestino.id },
      data: {
        quantidade: destinoPosterior,
        custoMedio: destinoCustoMedio,
        valorTotal: destinoPosterior.mul(destinoCustoMedio),
      },
    });

    const movimento = await tx.movimentoEstoque.create({
      data: {
        numero,
        tipo: TipoMovimentoEstoque.TRANSFERENCIA,
        status: StatusMovimentoEstoque.EFETIVADO,
        materialId: dto.materialId,
        localOrigemId: origem.id,
        localDestinoId: destino.id,
        obraId: dto.obraId,
        quantidade,
        unidade: dto.unidade,
        custoUnitario,
        custoTotal,
        saldoAnteriorOrigem: saldoOrigem.quantidade,
        saldoPosteriorOrigem: origemPosterior,
        saldoAnteriorDestino: saldoDestino.quantidade,
        saldoPosteriorDestino: destinoPosterior,
        dataMovimento,
        documentoTipo: dto.documentoTipo,
        documentoNumero: dto.documentoNumero,
        observacao: dto.observacao,
        registradoPorId: userId,
      },
    });

    await this.createAudit(tx, userId, 'ESTOQUE_TRANSFERENCIA_EFETIVADA', movimento.id, { origem: saldoOrigem, destino: saldoDestino }, movimento);
    return movimento;
  }

  private async getActiveLocation(tx: Tx, id: string) {
    const location = await tx.localEstoque.findUnique({ where: { id } });
    if (!location || !location.ativo) {
      throw new NotFoundException('Local de estoque ativo não encontrado');
    }
    return location;
  }

  private async getOrCreateLockedBalance(tx: Tx, materialId: string, localEstoqueId: string) {
    await tx.saldoEstoque.upsert({
      where: { materialId_localEstoqueId: { materialId, localEstoqueId } },
      update: {},
      create: { materialId, localEstoqueId },
    });

    await tx.$queryRaw`
      SELECT id FROM "saldos_estoque"
      WHERE "material_id" = ${materialId} AND "local_estoque_id" = ${localEstoqueId}
      FOR UPDATE
    `;

    const saldo = await tx.saldoEstoque.findUnique({
      where: { materialId_localEstoqueId: { materialId, localEstoqueId } },
    });
    if (!saldo) throw new NotFoundException('Saldo de estoque não encontrado');
    return saldo;
  }

  private async nextMovementNumber(tx: Tx) {
    const count = await tx.movimentoEstoque.count();
    return `EST-${String(count + 1).padStart(8, '0')}`;
  }

  private async createCostAppropriation(
    tx: Tx,
    movimentoEstoqueId: string,
    materialId: string,
    obraId: string,
    quantidade: Prisma.Decimal,
    custoUnitario: Prisma.Decimal,
    custoTotal: Prisma.Decimal,
    dataCompetencia: Date,
  ) {
    const material = await tx.material.findUnique({
      where: { id: materialId },
      include: { categoriaMaterial: true },
    });

    return tx.apropriacaoCustoEstoque.create({
      data: {
        movimentoEstoqueId,
        obraId,
        centroCustoId: material?.categoriaMaterial.centroCustoPadraoId,
        categoriaId: material?.categoriaMaterial.categoriaFinanceiraId,
        materialId,
        quantidade,
        custoUnitario,
        custoTotal,
        dataCompetencia,
      },
    });
  }

  private async createAudit(
    tx: Tx,
    usuarioId: string,
    acao: string,
    registroId: string,
    valorAntigo: unknown,
    valorNovo: unknown,
  ) {
    await tx.logAuditoria.create({
      data: {
        acao,
        tabela: 'movimentos_estoque',
        registroId,
        valorAntigo: valorAntigo ? JSON.stringify(valorAntigo) : undefined,
        valorNovo: JSON.stringify(valorNovo),
        motivo: 'Movimentação de estoque via serviço central',
        usuarioId,
      },
    });
  }
}
