import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRateioDto } from './dto/create-rateio.dto';
import { DreService } from '../dre/dre.service';

@Injectable()
export class RateioService {
  constructor(
    private prisma: PrismaService,
    private dreService: DreService,
  ) {}

  async findByLancamento(lancamentoId: string) {
    return this.prisma.rateioLancamento.findMany({
      where: { lancamentoId },
      include: {
        categoriaFinanceira: true,
        obra: true,
        centroCusto: true,
      },
    });
  }

  async saveBatch(
    lancamentoId: string,
    dtos: CreateRateioDto[],
    usuario?: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const lancamento = await tx.lancamentoFinanceiro.findUnique({
        where: { id: lancamentoId },
      });

      if (!lancamento) {
        throw new BadRequestException('Lançamento não encontrado');
      }

      if (dtos.some((r) => r.valor < 0)) {
        throw new BadRequestException(
          'O valor do rateio não pode ser negativo',
        );
      }

      if (dtos.length > 0) {
        const totalRateado = dtos.reduce((acc, curr) => acc + curr.valor, 0);
        const valorTotal = Number(lancamento.valor);

        if (Math.abs(totalRateado - valorTotal) > 0.01) {
          throw new BadRequestException(
            `A soma dos rateios (R$ ${totalRateado.toFixed(2)}) deve ser igual ao valor total do lançamento (R$ ${valorTotal.toFixed(2)})`,
          );
        }
      }

      const antigos = await tx.rateioLancamento.findMany({
        where: { lancamentoId },
      });

      await tx.rateioLancamento.deleteMany({
        where: { lancamentoId },
      });

      if (dtos.length === 0) {
        const novo = await tx.rateioLancamento.create({
          data: {
            lancamentoId,
            valor: lancamento.valor,
            categoria: 'OUTROS',
            categoriaFinanceiraId: lancamento.categoriaId,
            recorrente: lancamento.recorrente,
            updatedBy: usuario,
          },
        });

        await tx.rateioHistorico.create({
          data: {
            rateioId: novo.id,
            lancamentoId,
            valorAntigo: null,
            valorNovo: novo.valor,
            categoriaAntiga: null,
            categoriaNova: novo.categoria,
            usuario: usuario || 'sistema',
          },
        });
      } else {
        const novos = await Promise.all(
          dtos.map((dto) =>
            tx.rateioLancamento.create({
              data: {
                ...dto,
                lancamentoId,
                updatedBy: usuario,
              },
            }),
          ),
        );

        for (const novo of novos) {
          await tx.rateioHistorico.create({
            data: {
              rateioId: novo.id,
              lancamentoId,
              valorAntigo: null,
              valorNovo: novo.valor,
              categoriaAntiga: null,
              categoriaNova: novo.categoria,
              usuario: usuario || 'sistema',
            },
          });
        }
      }

      for (const antigo of antigos) {
        await tx.rateioHistorico.create({
          data: {
            rateioId: antigo.id,
            lancamentoId,
            valorAntigo: antigo.valor,
            valorNovo: null,
            categoriaAntiga: antigo.categoria,
            categoriaNova: null,
            usuario: usuario || 'sistema',
          },
        });
      }

      return this.findByLancamento(lancamentoId);
    });

    await this.dreService.invalidarCacheDRE();

    return result;
  }
}
