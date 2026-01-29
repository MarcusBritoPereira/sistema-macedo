import { Controller, Get, UseGuards, Delete, Param, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('financial/bank-accounts')
@UseGuards(AuthGuard('jwt'))
export class BankAccountsController {
    constructor(private prisma: PrismaService) { }

    @Get()
    async findAll() {
        const accounts = await this.prisma.contaBancaria.findMany({
            include: {
                integracao: true,
            },
        });

        // Add metadata for each account
        return Promise.all(accounts.map(async (acc) => {
            const pendingCount = await this.prisma.extratoBancario.count({
                where: {
                    importacao: {
                        contaBancariaId: acc.id
                    },
                    conciliado: false
                }
            });

            // Get last imported statement date
            const lastStatement = await this.prisma.extratoBancario.findFirst({
                where: {
                    importacao: {
                        contaBancariaId: acc.id
                    }
                },
                orderBy: {
                    data: 'desc'
                }
            });

            // Calculate current balance based on reconciled lancamentos
            const reconciledLancamentos = await this.prisma.lancamentoFinanceiro.findMany({
                where: {
                    contaBancariaId: acc.id,
                    status: 'CONCILIADO'
                },
                select: {
                    valor: true,
                    tipo: true
                }
            });

            const balanceAdjustment = reconciledLancamentos.reduce((total, l) => {
                const val = Number(l.valor);
                return total + (l.tipo === 'RECEITA' ? val : -val);
            }, 0);

            const currentBalance = Number(acc.saldoInicial) + balanceAdjustment;

            return {
                ...acc,
                pendingReconciliations: pendingCount,
                lastSync: acc.integracao?.lastSync,
                lastImported: lastStatement?.data,
                saldoAtual: currentBalance
            };
        }));
    }

    @Post()
    async create(@Body() data: any) {
        return this.prisma.contaBancaria.create({
            data: {
                nome: data.nome,
                banco: data.banco,
                agencia: data.agencia,
                conta: data.conta,
                codigoBanco: data.codigoBanco,
                saldoInicial: data.saldoInicial || 0,
            }
        });
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Delete Integration if exists
            await tx.integracaoBancaria.deleteMany({
                where: { contaBancariaId: id }
            });

            // 2. Delete Account
            return tx.contaBancaria.delete({
                where: { id }
            });
        });
    }
}
