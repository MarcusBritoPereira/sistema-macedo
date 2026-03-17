import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GerarDreDto, DRERegime, DREGranularidade } from './dto/gerar-dre.dto';
import { ClassificacaoDRE } from '@prisma/client';
import {
  startOfDay,
  endOfDay,
  format,
  addMonths,
  addQuarters,
  addYears,
  isBefore,
  isSameDay,
  getQuarter,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Injectable()
export class DreService {
  constructor(private prisma: PrismaService) {}

  async gerar(dto: GerarDreDto) {
    const { regime, dataInicio, dataFim, granularidade } = dto;
    const start = startOfDay(new Date(dataInicio));
    const end = endOfDay(new Date(dataFim));

    // 1. Buscar os dados baseados nos Rateios com Join nos Lançamentos
    const dateField =
      regime === DRERegime.CAIXA ? 'dataPagamento' : 'dataCompetencia';

    // @ts-ignore - Prisma types might be outdated in IDE
    const rateiosRaw = await this.prisma.rateioLancamento.findMany({
      where: {
        lancamento: {
          [dateField]: {
            gte: start,
            lte: end,
          },
          status:
            regime === DRERegime.CAIXA ? 'REALIZADO' : { not: 'CANCELADO' },
        },
      },
      include: {
        lancamento: true,
      },
    });

    // 2. Fallback: buscar lançamentos SEM rateio para garantir dados retroativos
    const lancamentosSemRateio =
      await this.prisma.lancamentoFinanceiro.findMany({
        where: {
          [dateField]: {
            gte: start,
            lte: end,
          },
          status:
            regime === DRERegime.CAIXA ? 'REALIZADO' : { not: 'CANCELADO' },
          // @ts-ignore
          rateios: { none: {} },
        },
        include: {
          categoria: true,
        },
      });

    // Normalizar dados para o processamento
    const classificationKeys = Object.values(ClassificacaoDRE);
    const normalizedData = [
      ...rateiosRaw.map((r: any) => ({
        valor: Number(r.valor),
        categoria: (classificationKeys.includes(r.categoria)
          ? r.categoria
          : 'OUTROS') as ClassificacaoDRE,
        subcategoria: r.subcategoria || 'Outros',
        data: r.lancamento[dateField],
        recorrente: r.recorrente,
      })),
      ...lancamentosSemRateio.map((l: any) => ({
        valor: Number(l.valor),
        categoria: (l.categoria?.classificacao &&
        classificationKeys.includes(l.categoria.classificacao)
          ? l.categoria.classificacao
          : 'OUTROS') as ClassificacaoDRE,
        subcategoria: l.categoria?.nome || 'Não categorizado',
        data: l[dateField],
        recorrente: l.recorrente,
      })),
    ];

    // 3. Agrupar por Período e Categoria
    const periodos = this.getPeriodKeys(start, end, granularidade);
    const result = this.initializeResultStructure(periodos);

    for (const item of normalizedData) {
      const pKey = this.getPeriodKey(item.data, granularidade);

      // Se não encontrar a categoria, joga em OUTROS
      const cat = result.data[item.categoria] ? item.categoria : 'OUTROS';

      if (!result.data[cat]) continue;

      // Adicionar aos valores principais
      result.data[cat].periodos[pKey] =
        (result.data[cat].periodos[pKey] || 0) + item.valor;
      result.data[cat].total += item.valor;

      // Adicionar às subcategorias
      if (!result.data[cat].subcategorias[item.subcategoria]) {
        result.data[cat].subcategorias[item.subcategoria] = {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        };
      }
      result.data[cat].subcategorias[item.subcategoria].periodos[pKey] +=
        item.valor;
      result.data[cat].subcategorias[item.subcategoria].total += item.valor;

      // Se for recorrente, adicionar ao cálculo recorrente (simplificado: Receita - Despesa)
      if (item.recorrente) {
        const isReceita = cat.startsWith('RECEITA');
        const valorCalc = isReceita ? item.valor : -item.valor;
        result.recorrente.periodos[pKey] =
          (result.recorrente.periodos[pKey] || 0) + valorCalc;
        result.recorrente.total += valorCalc;
      }
    }

    // 4. Calcular Totais e Margens
    return this.calculateFinalDRE(result, periodos);
  }

  private getPeriodKeys(
    start: Date,
    end: Date,
    gran: DREGranularidade,
  ): string[] {
    const keys: string[] = [];
    let current = start;

    while (isBefore(current, end) || isSameDay(current, end)) {
      keys.push(this.getPeriodKey(current, gran));
      if (gran === DREGranularidade.MENSAL) current = addMonths(current, 1);
      else if (gran === DREGranularidade.TRIMESTRAL)
        current = addQuarters(current, 1);
      else current = addYears(current, 1);
    }
    return Array.from(new Set(keys));
  }

  private getPeriodKey(date: Date, gran: DREGranularidade): string {
    const d = new Date(date);
    if (gran === DREGranularidade.MENSAL)
      return format(d, 'MMM/yy', { locale: ptBR });
    if (gran === DREGranularidade.TRIMESTRAL)
      return `Q${getQuarter(d)}/${format(d, 'yy')}`;
    return format(d, 'yyyy');
  }

  private initializeResultStructure(periodos: string[]) {
    const categories = Object.values(ClassificacaoDRE);
    const data: any = {};
    for (const cat of categories) {
      data[cat] = {
        total: 0,
        periodos: this.initializePeriodValues(periodos),
        subcategorias: {},
      };
    }

    return {
      periodos,
      data,
      totais: {
        receitaBruta: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        receitaLiquida: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        lucroBruto: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        ebit: { total: 0, periodos: this.initializePeriodValues(periodos) },
        lair: { total: 0, periodos: this.initializePeriodValues(periodos) },
        resultadoLiquido: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
      },
      margens: {
        receitaLiquida: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        bruta: { total: 0, periodos: this.initializePeriodValues(periodos) },
        ebit: { total: 0, periodos: this.initializePeriodValues(periodos) },
        lair: { total: 0, periodos: this.initializePeriodValues(periodos) },
        liquida: { total: 0, periodos: this.initializePeriodValues(periodos) },
      },
      recorrente: { total: 0, periodos: this.initializePeriodValues(periodos) },
    };
  }

  private initializePeriodValues(periodos: string[]) {
    const obj: any = {};
    for (const p of periodos) obj[p] = 0;
    return obj;
  }

  private calculateFinalDRE(result: any, periodos: string[]) {
    for (const p of periodos) {
      const data = result.data;

      // 1. Receitas
      const recRec = data.RECEITA_RECORRENTE.periodos[p];
      const recNaoRec = data.RECEITA_NAO_RECORRENTE.periodos[p];
      const deducoes = data.DEDUCOES_RECEITA.periodos[p];

      const recBruta = recRec + recNaoRec;
      const recLiquida = recBruta - deducoes;

      result.totais.receitaBruta.periodos[p] = recBruta;
      result.totais.receitaLiquida.periodos[p] = recLiquida;
      result.margens.receitaLiquida.periodos[p] =
        recBruta > 0 ? (recLiquida / recBruta) * 100 : 0;

      // 2. Lucro Bruto
      const custos = data.CUSTO_SERVICOS_PRESTADOS.periodos[p];
      const lucroBruto = recLiquida - custos;
      result.totais.lucroBruto.periodos[p] = lucroBruto;
      result.margens.bruta.periodos[p] =
        recLiquida > 0 ? (lucroBruto / recLiquida) * 100 : 0;

      // 3. EBIT
      const despesasOp =
        data.DESPESA_ADMINISTRATIVA.periodos[p] +
        data.DESPESA_COMERCIAL.periodos[p] +
        data.DESPESA_ESTRUTURAL.periodos[p] +
        data.DESPESA_SOCIOS.periodos[p];

      const ebit = lucroBruto - despesasOp;
      result.totais.ebit.periodos[p] = ebit;
      result.margens.ebit.periodos[p] =
        recLiquida > 0 ? (ebit / recLiquida) * 100 : 0;

      // 4. LAIR
      const despesasFin = data.DESPESA_FINANCEIRA.periodos[p];
      const recFin = data.RECEITA_FINANCEIRA.periodos[p];
      const lair = ebit - despesasFin + recFin;
      result.totais.lair.periodos[p] = lair;
      result.margens.lair.periodos[p] =
        recLiquida > 0 ? (lair / recLiquida) * 100 : 0;

      // 5. Resultado Líquido
      const impostos = data.IMPOSTOS_LUCRO.periodos[p];
      const resLiq = lair - impostos;
      result.totais.resultadoLiquido.periodos[p] = resLiq;
      result.margens.liquida.periodos[p] =
        recLiquida > 0 ? (resLiq / recLiquida) * 100 : 0;
    }

    // Calcular totais de linha
    result.totais.receitaBruta.total = Object.values(
      result.totais.receitaBruta.periodos,
    ).reduce((a: any, b: any) => a + b, 0);
    result.totais.receitaLiquida.total = Object.values(
      result.totais.receitaLiquida.periodos,
    ).reduce((a: any, b: any) => a + b, 0);
    result.totais.lucroBruto.total = Object.values(
      result.totais.lucroBruto.periodos,
    ).reduce((a: any, b: any) => a + b, 0);
    result.totais.ebit.total = Object.values(
      result.totais.ebit.periodos,
    ).reduce((a: any, b: any) => a + b, 0);
    result.totais.lair.total = Object.values(
      result.totais.lair.periodos,
    ).reduce((a: any, b: any) => a + b, 0);
    result.totais.resultadoLiquido.total = Object.values(
      result.totais.resultadoLiquido.periodos,
    ).reduce((a: any, b: any) => a + b, 0);

    // Margens totais
    const tRecBruta = result.totais.receitaBruta.total;
    const tRecLiq = result.totais.receitaLiquida.total;
    result.margens.receitaLiquida.total =
      tRecBruta > 0 ? (tRecLiq / tRecBruta) * 100 : 0;
    result.margens.bruta.total =
      tRecLiq > 0 ? (result.totais.lucroBruto.total / tRecLiq) * 100 : 0;
    result.margens.ebit.total =
      tRecLiq > 0 ? (result.totais.ebit.total / tRecLiq) * 100 : 0;
    result.margens.lair.total =
      tRecLiq > 0 ? (result.totais.lair.total / tRecLiq) * 100 : 0;
    result.margens.liquida.total =
      tRecLiq > 0 ? (result.totais.resultadoLiquido.total / tRecLiq) * 100 : 0;

    return result;
  }
}
