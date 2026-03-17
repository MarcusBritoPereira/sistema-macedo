import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRateioDto } from './dto/create-rateio.dto';

@Injectable()
export class RateioService {
  constructor(private prisma: PrismaService) {}

  async findByLancamento(lancamentoId: string) {
    return this.prisma.rateioLancamento.findMany({
      where: { lancamentoId },
      include: { categoriaFinanceira: true },
    });
  }

  async saveBatch(lancamentoId: string, dtos: CreateRateioDto[]) {
    return this.prisma.$transaction(async (tx) => {
      const lancamento = await tx.lancamentoFinanceiro.findUnique({
        where: { id: lancamentoId },
      });

      if (!lancamento) {
        throw new BadRequestException('Lançamento não encontrado');
      }

      // 1. Validação de valores negativos
      if (dtos.some((r) => r.valor < 0)) {
        throw new BadRequestException(
          'O valor do rateio não pode ser negativo',
        );
      }

      // 2. Validação da soma
      if (dtos.length > 0) {
        const totalRateado = dtos.reduce((acc, curr) => acc + curr.valor, 0);
        const valorTotal = Number(lancamento.valor);

        // Usando uma margem pequena para erros de ponto flutuante
        if (Math.abs(totalRateado - valorTotal) > 0.01) {
          throw new BadRequestException(
            `A soma dos rateios (R$ ${totalRateado.toFixed(2)}) deve ser igual ao valor total do lançamento (R$ ${valorTotal.toFixed(2)})`,
          );
        }
      }

      // 3. Deletar rateios antigos
      await tx.rateioLancamento.deleteMany({
        where: { lancamentoId },
      });

      // 4. Se não houver rateios informados, criar automático (100% na categoria do lançamento)
      if (dtos.length === 0) {
        await tx.rateioLancamento.create({
          data: {
            lancamentoId,
            valor: lancamento.valor,
            categoria: 'OUTROS', // Placeholder or Extract from category mapping
            categoriaFinanceiraId: lancamento.categoriaId,
            // @ts-ignore
            recorrente: lancamento.recorrente,
          },
        });
      } else {
        // 5. Criar novos rateios
        await tx.rateioLancamento.createMany({
          data: dtos.map((dto) => ({
            ...dto,
            lancamentoId,
          })),
        });
      }

      return this.findByLancamento(lancamentoId);
    });
  }
}
