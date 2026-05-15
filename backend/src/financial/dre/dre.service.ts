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

  async gerar(dto: GerarDreDto) {
    const cacheKey = this.getCacheKey('principal', dto);
    const cached = await (this.prisma as any).dreCache.findUnique({ where: { chave: cacheKey } });
    if (cached) {
      return cached.payload;
    }

    const { regime, dataInicio, dataFim, granularidade, centroCustoId, contaBancariaId } = dto;
    console.time(`DRE_Generation:${regime}:${granularidade}`);
    console.log(`[DRE] Iniciando geração: ${regime} ${granularidade} [${dataInicio} - ${dataFim}]`);
    
    const start = startOfDay(new Date(dataInicio));
    const end = endOfDay(new Date(dataFim));

    const dateField = regime === DRERegime.CAIXA ? 'dataPagamento' : 'dataCompetencia';

    const rateiosRaw = await this.prisma.rateioLancamento.findMany({
      where: {
        ...(centroCustoId ? { centroCustoId } : {}),
        lancamento: {
          [dateField]: {
            gte: start,
            lte: end,
          },
          status: regime === DRERegime.CAIXA ? 'REALIZADO' : { not: 'CANCELADO' },
          ...(contaBancariaId ? { contaBancariaId } : {}),
        },
      },
      include: {
        lancamento: true,
      },
    });

    const lancamentosSemRateio = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        [dateField]: {
          gte: start,
          lte: end,
        },
        status: regime === DRERegime.CAIXA ? 'REALIZADO' : { not: 'CANCELADO' },
        rateios: { none: {} },
        ...(centroCustoId ? { centroCustoId } : {}),
        ...(contaBancariaId ? { contaBancariaId } : {}),
      },
      include: {
        categoria: true,
      },
    });

    const cartoesRaw = await (this.prisma as any).cartaoTransacao.findMany({
      where: {
        dataCompetencia: {
          gte: start,
          lte: end,
        },
        status: { in: ['FATURADO', 'PAGO'] },
        // No Cost Center filter for credit cards yet as it's at the header level in this model
      },
      include: {
        categoriaFinanceira: true,
      },
    });

    const classificationKeys = Object.values(ClassificacaoDRE);
    const normalizedData = [
      ...rateiosRaw.map((r: any) => ({
        valor: Number(r.valor),
        categoria: (classificationKeys.includes(r.categoria) ? r.categoria : 'OUTROS') as ClassificacaoDRE,
        subcategoria: r.subcategoria || 'Outros',
        data: r.lancamento[dateField],
      })),
      ...lancamentosSemRateio.map((l: any) => ({
        valor: Number(l.valor),
        categoria: (
          l.categoria?.classificacao && classificationKeys.includes(l.categoria.classificacao)
            ? l.categoria.classificacao
            : 'OUTROS'
        ) as ClassificacaoDRE,
        subcategoria: l.categoria?.nome || 'Não categorizado',
        data: l[dateField],
      })),
      ...cartoesRaw.map((c: any) => ({
        valor: Number(c.valor),
        categoria: (
          c.categoriaFinanceira?.classificacao && classificationKeys.includes(c.categoriaFinanceira.classificacao)
            ? c.categoriaFinanceira.classificacao
            : 'OUTROS'
        ) as ClassificacaoDRE,
        subcategoria: c.categoriaFinanceira?.nome || 'Cartão (Não categorizado)',
        data: c.dataCompetencia,
      })),
    ];

    const periodos = this.getPeriodKeys(start, end, granularidade);
    const result = this.initializeResultStructure(periodos, dto);

    for (const item of normalizedData) {
      const pKey = this.getPeriodKey(item.data, granularidade);
      const cat = result.data[item.categoria] ? item.categoria : 'OUTROS';

      if (!result.data[cat]) continue;

      result.data[cat].periodos[pKey] = (result.data[cat].periodos[pKey] || 0) + item.valor;
      result.data[cat].total += item.valor;
      result.data[cat].detalhes.quantidade_lancamentos += 1;

      if (!result.data[cat].subcategorias[item.subcategoria]) {
        result.data[cat].subcategorias[item.subcategoria] = {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        };
      }
      result.data[cat].subcategorias[item.subcategoria].periodos[pKey] += item.valor;
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
    const cached = await (this.prisma as any).dreCache.findUnique({ where: { chave: cacheKey } });
    if (cached) {
      return cached.payload;
    }

    const start = startOfDay(new Date(dto.dataInicio));
    const end = endOfDay(new Date(dto.dataFim));
    const dateField = dto.regime === DRERegime.CAIXA ? 'dataPagamento' : 'dataCompetencia';

    const where: any = {
      categoria: dto.categoria,
      ...(dto.subcategoria ? { subcategoria: dto.subcategoria } : {}),
      ...(dto.centroCustoId ? { centroCustoId: dto.centroCustoId } : {}),
      lancamento: {
        [dateField]: {
          gte: start,
          lte: end,
        },
        ...(dto.contaBancariaId ? { contaBancariaId: dto.contaBancariaId } : {}),
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
      cliente: item.lancamento.cliente?.nomeFantasia || item.lancamento.cliente?.razaoSocial || null,
      centro_custo: item.lancamento.centroCusto?.nome || null,
    }));

    // For CartaoTransacao, we fetch category IDs first to avoid nested relation filter typing issues
    const categoriesWithClassification = await (this.prisma as any).categoriaFinanceira.findMany({
      where: { classificacao: dto.categoria },
      select: { id: true }
    });
    const categoryIds = categoriesWithClassification.map((c: any) => c.id);

    const cartoesDetails = await (this.prisma as any).cartaoTransacao.findMany({
      where: {
        categoriaId: { in: categoryIds },
        ...(dto.subcategoria ? { categoriaFinanceira: { nome: dto.subcategoria } } : {}),
        dataCompetencia: {
          gte: start,
          lte: end,
        },
        ...(dto.centroCustoId ? { centroCustoId: dto.centroCustoId } : {}),
      },
      include: {
        cliente: true,
        centroCusto: true,
      },
      orderBy: {
        dataCompetencia: 'asc',
      },
    });

    const detalhesCartoes = cartoesDetails.map((item: any) => ({
      id: item.id,
      data: item.dataCompetencia,
      descricao: item.descricao,
      valor: Number(item.valor),
      cliente: item.cliente?.nomeFantasia || item.cliente?.razaoSocial || null,
      centro_custo: item.centroCusto?.nome || null,
    }));

    const detalhesFinais = [...detalhes, ...detalhesCartoes].sort((a, b) => 
      new Date(a.data as Date).getTime() - new Date(b.data as Date).getTime()
    );

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

  private getPeriodKeys(start: Date, end: Date, gran: DREGranularidade): string[] {
    const keys: string[] = [];
    let current = start;

    while (isBefore(current, end) || isSameDay(current, end)) {
      keys.push(this.getPeriodKey(current, gran));
      if (gran === DREGranularidade.MENSAL) current = addMonths(current, 1);
      else if (gran === DREGranularidade.TRIMESTRAL) current = addQuarters(current, 1);
      else current = addYears(current, 1);
    }
    return Array.from(new Set(keys));
  }

  private getPeriodKey(date: Date, gran: DREGranularidade): string {
    const d = new Date(date);
    if (gran === DREGranularidade.MENSAL) return format(d, 'MMM/yy', { locale: ptBR });
    if (gran === DREGranularidade.TRIMESTRAL) return `Q${getQuarter(d)}/${format(d, 'yy')}`;
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
        receitaLiquida: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
        lucroBruto: {
          total: 0,
          periodos: this.initializePeriodValues(periodos),
        },
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
        lair: { total: 0, periodos: this.initializePeriodValues(periodos) },
        liquida: { total: 0, periodos: this.initializePeriodValues(periodos) },
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

      const recBruta = recRec + recNaoRec;
      const recLiquida = recBruta - deducoes;

      result.totais.receitaBruta.periodos[p] = recBruta;
      result.totais.receitaLiquida.periodos[p] = recLiquida;
      result.margens.receitaLiquida.periodos[p] = recBruta > 0 ? (recLiquida / recBruta) * 100 : 0;

      const custos = data.CUSTO_SERVICOS_PRESTADOS.periodos[p];
      const lucroBruto = recLiquida - custos;
      result.totais.lucroBruto.periodos[p] = lucroBruto;
      result.margens.bruta.periodos[p] = recLiquida > 0 ? (lucroBruto / recLiquida) * 100 : 0;

      const despesasOp =
        data.DESPESA_ADMINISTRATIVA.periodos[p] +
        data.DESPESA_COMERCIAL.periodos[p] +
        data.DESPESA_ESTRUTURAL.periodos[p] +
        data.DESPESA_SOCIOS.periodos[p];

      const despesasFin = data.DESPESA_FINANCEIRA.periodos[p];
      const recFin = data.RECEITA_FINANCEIRA.periodos[p];
      
      const lucroOperacional = lucroBruto - despesasOp;
      const lair = lucroOperacional - despesasFin + recFin;
      
      result.totais.lair.periodos[p] = lair;
      result.margens.lair.periodos[p] = recLiquida > 0 ? (lair / recLiquida) * 100 : 0;

      const impostos = data.IMPOSTOS_LUCRO.periodos[p];
      const resLiq = lair - impostos;
      result.totais.resultadoLiquido.periodos[p] = resLiq;
      result.margens.liquida.periodos[p] = recLiquida > 0 ? (resLiq / recLiquida) * 100 : 0;
    }

    for (const key of Object.keys(result.totais)) {
      result.totais[key].total = Object.values(result.totais[key].periodos).reduce(
        (a: number, b: any) => a + Number(b),
        0,
      );
    }

    for (const key of Object.keys(result.margens)) {
      const avg = (Object.values(result.margens[key].periodos) as number[]).reduce(
        (a: number, b: number) => a + Number(b),
        0,
      );
      result.margens[key].total = periodos.length > 0 ? avg / periodos.length : 0;
    }

    console.log(`[DRE] Finalizando: ${periodos.length} períodos calculados`);
    console.timeEnd(`DRE_Generation:${result.regime || ''}:${result.granularidade || ''}`);
    return result;
  }
}
