import { Injectable } from '@nestjs/common';
import { Prisma, ClassificacaoDRE } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GerarDreDto, DRERegime, DREGranularidade } from './dto/gerar-dre.dto';
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
import { DREDetalhesDto } from './dto/dre-detalhes.dto';

@Injectable()
export class DreService {
  constructor(private prisma: PrismaService) {}

  private async obterIdsHierarquia(centroCustoId: string): Promise<string[]> {
    const ccs = await this.prisma.centroCusto.findMany({
      select: { id: true, parentId: true }
    });

    const filhos: string[] = [centroCustoId];
    const processar = (id: string) => {
      const directChildren = ccs.filter(c => c.parentId === id);
      directChildren.forEach(child => {
        filhos.push(child.id);
        processar(child.id);
      });
    };

    processar(centroCustoId);
    return filhos;
  }

  async gerar(dto: GerarDreDto) {
    const cacheKey = this.getCacheKey('principal', dto);
    const cached = await (this.prisma as any).dreCache.findUnique({
      where: { chave: cacheKey },
    });
    if (cached) {
      return cached.payload;
    }

    const {
      regime,
      dataInicio,
      dataFim,
      granularidade,
      centroCustoId,
      contaBancariaId,
    } = dto;
    console.time(`DRE_Generation:${regime}:${granularidade}`);
    console.log(
      `[DRE] Iniciando geração: ${regime} ${granularidade} [${dataInicio} - ${dataFim}]`,
    );

    const start = startOfDay(new Date(dataInicio));
    const end = endOfDay(new Date(dataFim));

    const dateField =
      regime === DRERegime.CAIXA ? 'dataPagamento' : 'dataCompetencia';

    const costCenterIds = centroCustoId ? await this.obterIdsHierarquia(centroCustoId) : undefined;

    const rateiosRaw = await this.prisma.rateioLancamento.findMany({
      where: {
        ...(costCenterIds ? { centroCustoId: { in: costCenterIds } } : {}),
        lancamento: {
          [dateField]: {
            gte: start,
            lte: end,
          },
          status:
            regime === DRERegime.CAIXA ? 'REALIZADO' : { not: 'CANCELADO' },
          ...(contaBancariaId ? { contaBancariaId } : {}),
        },
      },
      include: {
        lancamento: true,
      },
    });

    const lancamentosSemRateio =
      await this.prisma.lancamentoFinanceiro.findMany({
        where: {
          [dateField]: {
            gte: start,
            lte: end,
          },
          status:
            regime === DRERegime.CAIXA ? 'REALIZADO' : { not: 'CANCELADO' },
          rateios: { none: {} },
          ...(costCenterIds ? { centroCustoId: { in: costCenterIds } } : {}),
          ...(contaBancariaId ? { contaBancariaId } : {}),
        },
        include: {
          categoria: true,
        },
      });

    const classificationKeys = Object.values(ClassificacaoDRE);
    const normalizedData = [
      ...rateiosRaw.map((r: any) => ({
        valor: Number(r.valor),
        categoria: (classificationKeys.includes(r.categoria)
          ? r.categoria
          : 'OUTROS') as ClassificacaoDRE,
        subcategoria: r.subcategoria || 'Outros',
        data: r.lancamento[dateField],
      })),
      ...lancamentosSemRateio.map((l: any) => ({
        valor: Number(l.valor),
        categoria: (l.categoria?.classificacao &&
        classificationKeys.includes(l.categoria.classificacao)
          ? l.categoria.classificacao
          : 'OUTROS') as ClassificacaoDRE,
        subcategoria: l.categoria?.nome || 'Não categorizado',
        data: l[dateField],
      })),
    ];

    const periodos = this.getPeriodKeys(start, end, granularidade);
    const result = this.initializeResultStructure(periodos, dto);

    for (const item of normalizedData) {
      const pKey = this.getPeriodKey(item.data, granularidade);
      const cat = result.data[item.categoria] ? item.categoria : 'OUTROS';

      if (!result.data[cat]) continue;

      result.data[cat].periodos[pKey] =
        (result.data[cat].periodos[pKey] || 0) + item.valor;
      result.data[cat].total += item.valor;
      result.data[cat].detalhes.quantidade_lancamentos += 1;

      if (!result.data[cat].subcategorias[item.subcategoria]) {
        result.data[cat].subcategorias[item.subcategoria] = {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        };
      }
      result.data[cat].subcategorias[item.subcategoria].periodos[pKey] +=
        item.valor;
      result.data[cat].subcategorias[item.subcategoria].total += item.valor;
    }

    const final = this.calculateFinalDRE(result, periodos);

    await (this.prisma as any).dreCache.upsert({
      where: { chave: cacheKey },
      update: { payload: final },
      create: { chave: cacheKey, payload: final },
    });

    return final;
  }

  async obterDetalhesDRE(dto: DREDetalhesDto) {
    const cacheKey = this.getCacheKey('detalhes', dto);
    const cached = await (this.prisma as any).dreCache.findUnique({
      where: { chave: cacheKey },
    });
    if (cached) {
      return cached.payload;
    }

    const start = startOfDay(new Date(dto.dataInicio));
    const end = endOfDay(new Date(dto.dataFim));
    const dateField =
      dto.regime === DRERegime.CAIXA ? 'dataPagamento' : 'dataCompetencia';

    const costCenterIds = dto.centroCustoId ? await this.obterIdsHierarquia(dto.centroCustoId) : undefined;

    const where: any = {
      categoria: dto.categoria,
      ...(dto.subcategoria ? { subcategoria: dto.subcategoria } : {}),
      ...(costCenterIds ? { centroCustoId: { in: costCenterIds } } : {}),
      lancamento: {
        [dateField]: {
          gte: start,
          lte: end,
        },
        ...(dto.contaBancariaId
          ? { contaBancariaId: dto.contaBancariaId }
          : {}),
      },
    };

    const itens = await (this.prisma as any).rateioLancamento.findMany({
      where,
      include: {
        lancamento: {
          include: {
            cliente: true,
            centroCusto: true,
          },
        },
      },
      orderBy: {
        lancamento: {
          [dateField]: 'asc',
        },
      },
    });

    const detalhes = itens.map((item: any) => ({
      id: item.lancamento.id,
      data: item.lancamento[dateField] as Date,
      descricao: item.lancamento.descricao,
      valor: Number(item.valor),
      cliente:
        item.lancamento.cliente?.nomeFantasia ||
        item.lancamento.cliente?.razaoSocial ||
        null,
      centro_custo: item.lancamento.centroCusto?.nome || null,
    }));

    const detalhesFinais = detalhes;

    await (this.prisma as any).dreCache.upsert({
      where: { chave: cacheKey },
      update: { payload: detalhesFinais },
      create: { chave: cacheKey, payload: detalhesFinais },
    });

    return detalhesFinais;
  }

  async invalidarCacheDRE() {
    await (this.prisma as any).dreCache.deleteMany({});
  }

  private getCacheKey(prefix: string, dto: Record<string, any>): string {
    return `${prefix}:${JSON.stringify(dto)}`;
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

  private initializeResultStructure(periodos: string[], dto: GerarDreDto) {
    const categories = Object.values(ClassificacaoDRE);
    const data: any = {};
    for (const cat of categories) {
      data[cat] = {
        total: 0,
        periodos: this.initializePeriodValues(periodos),
        subcategorias: {},
        detalhes: {
          url: `/dre/detalhes?categoria=${encodeURIComponent(cat)}&inicio=${dto.dataInicio}&fim=${dto.dataFim}&regime=${dto.regime}`,
          quantidade_lancamentos: 0,
        },
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
        impostosDeducoes: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        receitaLiquida: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        custoServicos: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        lucroBruto: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        despesasOperacionais: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        resultadoOperacional: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        despesasFinanceirasLiquidas: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        resultadoLiquido: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        investimentos: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        resultadoFinal: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        // Kept for legacy compatibility
        lair: { total: 0, periodos: this.initializePeriodValues(periodos) },
      },
      margens: {
        receitaLiquida: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        bruta: { total: 0, periodos: this.initializePeriodValues(periodos) },
        resultadoOperacional: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        liquida: { total: 0, periodos: this.initializePeriodValues(periodos) },
        resultadoFinal: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        // Kept for legacy compatibility
        lair: { total: 0, periodos: this.initializePeriodValues(periodos) },
      },
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

      const recRec = data.RECEITA_RECORRENTE.periodos[p];
      const recNaoRec = data.RECEITA_NAO_RECORRENTE.periodos[p];
      const deducoes = data.DEDUCOES_RECEITA.periodos[p];
      const impostosLucro = data.IMPOSTOS_LUCRO.periodos[p];

      // 1. Receita Bruta
      const recBruta = recRec + recNaoRec;
      result.totais.receitaBruta.periodos[p] = recBruta;

      // 2. Impostos e deduções (DEDUCOES_RECEITA + IMPOSTOS_LUCRO)
      const impDeducoes = deducoes + impostosLucro;
      result.totais.impostosDeducoes.periodos[p] = impDeducoes;

      // 3. Receita líquida (Receita Bruta - Impostos e deduções)
      const recLiquida = recBruta - impDeducoes;
      result.totais.receitaLiquida.periodos[p] = recLiquida;

      // Margem (2/1) -> Receita líquida / Receita Bruta
      result.margens.receitaLiquida.periodos[p] =
        recBruta > 0 ? (recLiquida / recBruta) * 100 : 0;

      // 4. Custo dos serviços prestados
      const custos = data.CUSTO_SERVICOS_PRESTADOS.periodos[p];
      result.totais.custoServicos.periodos[p] = custos;

      // 5. Lucro bruto (Receita líquida - Custos)
      const lucroBruto = recLiquida - custos;
      result.totais.lucroBruto.periodos[p] = lucroBruto;

      // Margem (3/2) -> Lucro bruto / Receita líquida
      result.margens.bruta.periodos[p] =
        recLiquida > 0 ? (lucroBruto / recLiquida) * 100 : 0;

      // 6. Despesas Operacionais (Administrativas + Comerciais + Estruturais + Sócios)
      const despesasOp =
        data.DESPESA_ADMINISTRATIVA.periodos[p] +
        data.DESPESA_COMERCIAL.periodos[p] +
        data.DESPESA_ESTRUTURAL.periodos[p] +
        data.DESPESA_SOCIOS.periodos[p];
      result.totais.despesasOperacionais.periodos[p] = despesasOp;

      // 7. Resultado operacional (Lucro bruto - Despesas Operacionais)
      const resultadoOperacional = lucroBruto - despesasOp;
      result.totais.resultadoOperacional.periodos[p] = resultadoOperacional;

      // Margem (4/2) -> Resultado operacional / Receita líquida
      result.margens.resultadoOperacional.periodos[p] =
        recLiquida > 0 ? (resultadoOperacional / recLiquida) * 100 : 0;

      // 8. Despesas financeiras líquidas (Despesas Financeiras - Receitas Financeiras)
      const despesasFin = data.DESPESA_FINANCEIRA.periodos[p];
      const recFin = data.RECEITA_FINANCEIRA.periodos[p];
      const despesasFinLiquidas = despesasFin - recFin;
      result.totais.despesasFinanceirasLiquidas.periodos[p] = despesasFinLiquidas;

      // 9. Resultado líquido (Resultado operacional - Despesas financeiras líquidas)
      const resLiq = resultadoOperacional - despesasFinLiquidas;
      result.totais.resultadoLiquido.periodos[p] = resLiq;

      // Margem (5/2) -> Resultado líquido / Receita líquida
      result.margens.liquida.periodos[p] =
        recLiquida > 0 ? (resLiq / recLiquida) * 100 : 0;

      // 10. Investimentos
      const investimentos = data.INVESTIMENTOS.periodos[p];
      result.totais.investimentos.periodos[p] = investimentos;

      // 11. Resultado final (Resultado líquido - Investimentos)
      const resFinal = resLiq - investimentos;
      result.totais.resultadoFinal.periodos[p] = resFinal;

      // Margem final -> Resultado final / Receita líquida
      result.margens.resultadoFinal.periodos[p] =
        recLiquida > 0 ? (resFinal / recLiquida) * 100 : 0;

      // Legacy fields
      result.totais.lair.periodos[p] = resultadoOperacional - despesasFin + recFin;
      result.margens.lair.periodos[p] =
        recLiquida > 0 ? (result.totais.lair.periodos[p] / recLiquida) * 100 : 0;
    }

    for (const key of Object.keys(result.totais)) {
      result.totais[key].total = Object.values(
        result.totais[key].periodos,
      ).reduce((a: number, b: any) => a + Number(b), 0);
    }

    for (const key of Object.keys(result.margens)) {
      const avg = Object.values(result.margens[key].periodos).reduce(
        (a: number, b: any) => a + Number(b),
        0,
      ) as number;
      result.margens[key].total =
        periodos.length > 0 ? avg / periodos.length : 0;
    }

    console.log(`[DRE] Finalizando: ${periodos.length} períodos calculados`);
    console.timeEnd(
      `DRE_Generation:${result.regime || ''}:${result.granularidade || ''}`,
    );
    return result;
  }
}
