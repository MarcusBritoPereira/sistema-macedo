import {
  Controller,
  Get,
  UseGuards,
  Delete,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('financial/bank-accounts')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BankAccountsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('can_manage_banking')
  async findAll() {
    const accounts = await this.prisma.contaBancaria.findMany({
      select: {
        id: true,
        nome: true,
        banco: true,
        agencia: true,
        conta: true,
        codigoBanco: true,
        saldoInicial: true,
        createdAt: true,
        updatedAt: true,
        integracao: {
          select: {
            id: true,
            banco: true,
            status: true,
            lastSync: true,
            dataInicioAutomacao: true,
          },
        },
      },
    });
    const ids = accounts.map((acc) => acc.id);

    const pendingByAccount = await this.prisma.extratoBancario.groupBy({
      by: ['importacaoId'],
      _count: { _all: true },
      where: {
        conciliado: false,
        importacao: {
          contaBancariaId: { in: ids },
        },
      },
    });

    const imports = await this.prisma.importacaoBancaria.findMany({
      where: { contaBancariaId: { in: ids } },
      select: { id: true, contaBancariaId: true },
    });
    const importToAccount = new Map(
      imports.map((i) => [i.id, i.contaBancariaId]),
    );
    const pendingMap = new Map<string, number>();
    for (const item of pendingByAccount) {
      const accountId = importToAccount.get(item.importacaoId || '');
      if (!accountId) continue;
      pendingMap.set(
        accountId,
        (pendingMap.get(accountId) || 0) + item._count._all,
      );
    }

    const [lastStatements, reconciledAgg] = await Promise.all([
      this.prisma.extratoBancario.findMany({
        where: { importacao: { contaBancariaId: { in: ids } } },
        orderBy: { data: 'desc' },
        select: {
          data: true,
          importacao: { select: { contaBancariaId: true } },
        },
      }),
      this.prisma.lancamentoFinanceiro.groupBy({
        by: ['contaBancariaId', 'tipo'],
        where: { contaBancariaId: { in: ids }, status: 'CONCILIADO' },
        _sum: { valor: true },
      }),
    ]);

    const lastImportedMap = new Map<string, Date>();
    for (const row of lastStatements) {
      const accountId = row.importacao?.contaBancariaId;
      if (accountId && !lastImportedMap.has(accountId)) {
        lastImportedMap.set(accountId, row.data);
      }
    }
    const balanceMap = new Map<string, number>();
    for (const row of reconciledAgg) {
      const id = row.contaBancariaId;
      if (!id) continue;
      const current = balanceMap.get(id) || 0;
      const value = Number(row._sum.valor || 0);
      balanceMap.set(id, current + (row.tipo === 'RECEITA' ? value : -value));
    }

    return accounts.map((acc) => ({
      ...acc,
      pendingReconciliations: pendingMap.get(acc.id) || 0,
      lastSync: acc.integracao ? acc.integracao.lastSync : null,
      statusIntegracao: acc.integracao
        ? acc.integracao.status
        : 'NOT_CONFIGURED',
      lastImported: lastImportedMap.get(acc.id) || null,
      saldoAtual: Number(acc.saldoInicial) + (balanceMap.get(acc.id) || 0),
    }));
  }

  @Post()
  @RequirePermissions('can_manage_banking')
  async create(@Body() data: any) {
    return this.prisma.contaBancaria.create({
      data: {
        nome: data.nome,
        banco: data.banco,
        agencia: data.agencia,
        conta: data.conta,
        codigoBanco: data.codigoBanco,
        saldoInicial: data.saldoInicial || 0,
      },
    });
  }

  @Delete(':id')
  @RequirePermissions('can_manage_banking')
  async delete(@Param('id') id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete Integration if exists
      await tx.integracaoBancaria.deleteMany({
        where: { contaBancariaId: id },
      });

      // 2. Delete Account
      return tx.contaBancaria.delete({
        where: { id },
      });
    });
  }
}
