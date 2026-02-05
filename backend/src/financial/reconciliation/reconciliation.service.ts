
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatusLancamento } from '@prisma/client';

@Injectable()
export class ReconciliationService {
    constructor(private prisma: PrismaService) { }

    async getBankStatements(contaBancariaId: string, filters?: any) {
        const where: any = {
            importacao: { contaBancariaId }
        };

        if (filters?.startDate || filters?.endDate) {
            where.data = {};
            if (filters.startDate) where.data.gte = new Date(filters.startDate);
            if (filters.endDate) where.data.lte = new Date(filters.endDate);
        }

        if (filters?.status === 'PENDING') where.conciliado = false;
        if (filters?.status === 'CONCILIATED') where.conciliado = true;

        if (filters?.search) {
            const num = Number(filters.search);
            where.OR = [
                { descricao: { contains: filters.search, mode: 'insensitive' } },
                {
                    conciliacoes: {
                        some: {
                            lancamentoFinanceiro: {
                                categoria: {
                                    nome: { contains: filters.search, mode: 'insensitive' }
                                }
                            }
                        }
                    }
                }
            ];
            if (!isNaN(num)) {
                where.OR.push({ valor: num });
            }
        }

        // Filter by Category (requires joining relations)
        // Since Category is on LancamentoFinanceiro, which is linked via Conciliacao
        if (filters?.categoryId) {
            where.conciliacoes = {
                some: {
                    lancamentoFinanceiro: {
                        categoriaId: filters.categoryId
                    }
                }
            };
        }

        return this.prisma.extratoBancario.findMany({
            where,
            include: {
                conciliacoes: {
                    include: {
                        lancamentoFinanceiro: true
                    }
                },
                importacao: true
            },
            orderBy: { data: 'desc' }
        });
    }

    async findSuggestedMatches(statementId: string) {
        const statement = await this.prisma.extratoBancario.findUnique({
            where: { id: statementId }
        });

        if (!statement) throw new NotFoundException('Extrato não encontrado');

        // Basic suggestion: exact value and close date (+/- 7 days)
        const marginDays = 7;
        const startDate = new Date(statement.data);
        startDate.setDate(startDate.getDate() - marginDays);
        const endDate = new Date(statement.data);
        endDate.setDate(endDate.getDate() + marginDays);

        return this.prisma.lancamentoFinanceiro.findMany({
            where: {
                valor: statement.valor,
                dataVencimento: {
                    gte: startDate,
                    lte: endDate
                },
                status: { not: 'CANCELADO' },
                conciliacoes: { none: {} } // Only those not yet conciliated
            },
            include: {
                categoria: true,
                centroCusto: true
            }
        });
    }

    async linkManual(statementId: string, lancamentoId: string) {
        return this.prisma.$transaction(async (tx) => {
            const statement = await tx.extratoBancario.findUnique({ where: { id: statementId } });
            const lancamento = await tx.lancamentoFinanceiro.findUnique({ where: { id: lancamentoId } });

            if (!statement || !lancamento) throw new NotFoundException('Extrato ou Lançamento não encontrado');
            if (statement.conciliado) throw new BadRequestException('Extrato já conciliado');

            // Create link
            await tx.conciliacaoBancaria.create({
                data: {
                    extratoBancarioId: statementId,
                    lancamentoFinanceiroId: lancamentoId,
                    type: 'MANUAL_LINK'
                }
            });

            // Update statuses
            await tx.extratoBancario.update({
                where: { id: statementId },
                data: { conciliado: true }
            });

            await tx.lancamentoFinanceiro.update({
                where: { id: lancamentoId },
                data: {
                    status: 'CONCILIADO',
                    dataPagamento: statement.data // Use bank date as payment date
                }
            });

            return { success: true };
        });
    }

    async createAndLink(statementId: string, data: any) {
        return this.prisma.$transaction(async (tx) => {
            const statement = await tx.extratoBancario.findUnique({
                where: { id: statementId },
                include: { importacao: true }
            });
            if (!statement) throw new NotFoundException('Extrato não encontrado');
            if (statement.conciliado) throw new BadRequestException('Extrato já conciliado');

            // Sanitize optional fields ('' -> null)
            const sanitize = (val: any) => (val === '' || val === 'null' || val === undefined) ? null : val;

            const categoriaId = sanitize(data.categoriaId);
            const centroCustoId = sanitize(data.centroCustoId);
            const fornecedorId = sanitize(data.fornecedorId);
            const clienteId = sanitize(data.clienteId);
            const dataCompetencia = sanitize(data.dataCompetencia);
            const competenciaDate = dataCompetencia ? new Date(dataCompetencia) : statement.data;
            const isTransfer = data?.isTransfer === true || data?.isTransfer === 'true';
            const contaDestinoId = sanitize(data.contaDestinoId);

            if (isTransfer) {
                if (!contaDestinoId) {
                    throw new BadRequestException('Conta de destino é obrigatória para transferência');
                }

                const contaOrigemId = statement.importacao?.contaBancariaId;
                if (!contaOrigemId) {
                    throw new BadRequestException('Conta de origem não encontrada no extrato');
                }

                const tipoOrigem = statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA';
                const tipoDestino = tipoOrigem === 'RECEITA' ? 'DESPESA' : 'RECEITA';
                const descricaoTransferencia = data.descricao || `Transferência entre contas: ${statement.descricao}`;

                const lancamentoOrigem = await tx.lancamentoFinanceiro.create({
                    data: {
                        descricao: descricaoTransferencia,
                        valor: statement.valor,
                        tipo: tipoOrigem,
                        dataVencimento: statement.data,
                        dataPagamento: statement.data,
                        dataCompetencia: competenciaDate,
                        status: 'CONCILIADO',
                        contaBancariaId: contaOrigemId,
                        observacoes: `Transferência conciliada: ${statement.descricao}`
                    }
                });

                await tx.lancamentoFinanceiro.create({
                    data: {
                        descricao: descricaoTransferencia,
                        valor: statement.valor,
                        tipo: tipoDestino,
                        dataVencimento: statement.data,
                        dataPagamento: statement.data,
                        dataCompetencia: competenciaDate,
                        status: 'REALIZADO',
                        contaBancariaId: contaDestinoId,
                        observacoes: `Transferência gerada via conciliação: ${statement.descricao}`
                    }
                });

                await tx.conciliacaoBancaria.create({
                    data: {
                        extratoBancarioId: statementId,
                        lancamentoFinanceiroId: lancamentoOrigem.id,
                        type: 'MANUAL_CREATE'
                    }
                });

                await tx.extratoBancario.update({
                    where: { id: statementId },
                    data: { conciliado: true }
                });

                return lancamentoOrigem;
            }

            // 1. Create Lancamento
            const lancamento = await tx.lancamentoFinanceiro.create({
                data: {
                    descricao: data.descricao || statement.descricao,
                    valor: statement.valor,
                    tipo: statement.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA',
                    dataVencimento: statement.data,
                    dataPagamento: statement.data,
                    dataCompetencia: competenciaDate,
                    status: 'CONCILIADO',
                    categoriaId: categoriaId,
                    centroCustoId: centroCustoId,
                    clienteId: clienteId,
                    fornecedorId: fornecedorId, // Added missing mapping
                    observacoes: `Criado via conciliação bancária: ${statement.descricao}`
                }
            });

            // 2. Create link
            await tx.conciliacaoBancaria.create({
                data: {
                    extratoBancarioId: statementId,
                    lancamentoFinanceiroId: lancamento.id,
                    type: 'MANUAL_CREATE'
                }
            });

            // 3. Update statement
            await tx.extratoBancario.update({
                where: { id: statementId },
                data: { conciliado: true }
            });

            return lancamento;
        });
    }

    async unlink(conciliacaoId: string) {
        return this.prisma.$transaction(async (tx) => {
            const link = await tx.conciliacaoBancaria.findUnique({
                where: { id: conciliacaoId }
            });

            if (!link) throw new NotFoundException('Conciliação não encontrada');

            await tx.conciliacaoBancaria.delete({ where: { id: conciliacaoId } });

            await tx.extratoBancario.update({
                where: { id: link.extratoBancarioId },
                data: { conciliado: false }
            });

            await tx.lancamentoFinanceiro.update({
                where: { id: link.lancamentoFinanceiroId },
                data: { status: 'REALIZADO' } // Revert to Paid
            });

            return { success: true };
        });
    }
}
