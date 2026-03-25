import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassificationEngineService } from './classification-engine.service';
import { parse } from 'csv-parse/sync';
import { BankingIntegrationService } from '../banking-integration/banking-integration.service';
import * as fs from 'fs';

@Injectable()
export class CreditCardsService {
  constructor(
    private prisma: PrismaService,
    private classificationEngine: ClassificationEngineService,
    private bankingIntegrationService: BankingIntegrationService
  ) {}

  async importarFaturaCSV(csvData: string, cartaoId: string = 'default') {
    // Basic CSV Parse
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      delimiter: [',', ';']
    });

    if (records.length === 0) {
      throw new BadRequestException('CSV vazio ou inválido');
    }

    // Determine invoice dates dynamically based on data
    // Assuming CSV has Data, Descrição, Valor
    let sum = 0;
    const transactionsData: any[] = [];
    const minDate = new Date();
    
    for (const record of records) {
      const dataStr = record['Data'] || record['date'];
      const desc = record['Descrição'] || record['descricao'] || record['description'];
      const valStr = record['Valor'] || record['valor'] || record['value'] || record['Amount'];

      if (!dataStr || !desc || !valStr) continue;

      const valorNumerico = parseFloat(valStr.replace(',', '.'));
      const dataCompetencia = new Date(dataStr.split('/').reverse().join('-')); // D/M/Y to Y-M-D fallback
      
      sum += valorNumerico;

      const classificado = await this.classificationEngine.classificarTransacao(desc);

      transactionsData.push({
        cartaoId,
        descricao: desc,
        valor: valorNumerico,
        dataCompra: dataCompetencia,
        dataCompetencia,
        categoriaId: classificado.categoriaId,
        subcategoriaId: classificado.subcategoriaId,
        confiancaClassificacao: classificado.confianca,
        status: 'FATURADO' as const
      });
    }

    if (transactionsData.length === 0) {
      throw new BadRequestException('Nenhuma transação válida encontrada no CSV');
    }

    // Vencimento = end of current month of import or max trans date + 10 days
    const maxDateStr = transactionsData.map((t: any) => t.dataCompra.getTime()).reduce((a, b) => Math.max(a, b));
    const dataVencimento = new Date(maxDateStr);
    dataVencimento.setDate(dataVencimento.getDate() + 10);

    const fatura = await (this.prisma as any).faturaCartao.create({
      data: {
        cartaoId,
        dataFechamento: new Date(),
        dataVencimento,
        valorTotal: sum,
        status: 'ABERTA',
        transacoes: {
          create: transactionsData
        }
      },
      include: { transacoes: true }
    });

    return fatura;
  }

  async getInvoices() {
    return (this.prisma as any).faturaCartao.findMany({ orderBy: { dataVencimento: 'desc' } });
  }

  async getTransactions(faturaId: string) {
    return (this.prisma as any).cartaoTransacao.findMany({
      where: { faturaId },
      include: { categoriaFinanceira: true, centroCusto: true, fatura: true }
    });
  }

  async getAllTransactions(filters: { cartaoId?: string, startDate?: Date, endDate?: Date }) {
    const where: any = {};
    if (filters.cartaoId) where.cartaoId = filters.cartaoId;
    if (filters.startDate || filters.endDate) {
      where.dataCompra = {};
      if (filters.startDate) where.dataCompra.gte = filters.startDate;
      if (filters.endDate) where.dataCompra.lte = filters.endDate;
    }
    return (this.prisma as any).cartaoTransacao.findMany({
      where,
      include: { categoriaFinanceira: true, centroCusto: true, fatura: true },
      orderBy: { dataCompra: 'desc' }
    });
  }

  async linkToFinancialEntry(transactionId: string, entryId: string) {
    return (this.prisma as any).cartaoTransacao.update({
      where: { id: transactionId },
      data: {
        lancamentoRelacionadoId: entryId,
        status: 'CONCILIADO'
      }
    });
  }

  async classificarLote(ids: string[], updates: { categoriaId?: string, subcategoriaId?: string, centroCustoId?: string }) {
    await (this.prisma as any).cartaoTransacao.updateMany({
      where: { id: { in: ids } },
      data: updates
    });

    // Learn from manual classification
    const transacoes = await (this.prisma as any).cartaoTransacao.findMany({ where: { id: { in: ids } } });
    for (const tx of transacoes) {
      if (updates.categoriaId || updates.subcategoriaId) {
        await this.classificationEngine.aprenderRegra(tx.descricao, updates.categoriaId || null, updates.subcategoriaId || null);
      }
    }

    return { updated: ids.length };
  }

  async applyAutoRules(ids: string[]) {
    const transactions = await (this.prisma as any).cartaoTransacao.findMany({ where: { id: { in: ids }, categoriaId: null } });
    let count = 0;
    
    for (const tx of transactions) {
      const classificado = await this.classificationEngine.classificarTransacao(tx.descricao);
      if (classificado.categoriaId || classificado.subcategoriaId) {
        await (this.prisma as any).cartaoTransacao.update({
          where: { id: tx.id },
          data: {
            categoriaId: classificado.categoriaId,
            subcategoriaId: classificado.subcategoriaId,
            confiancaClassificacao: classificado.confianca
          }
        });
        count++;
      }
    }
    return { classified: count };
  }

  async pagarFatura(faturaId: string, contaBancariaId: string, dataPagamento: Date) {
    const fatura = await (this.prisma as any).faturaCartao.findUnique({ where: { id: faturaId } });
    if (!fatura) throw new BadRequestException('Fatura não encontrada');
    if (fatura.status === 'PAGA') throw new BadRequestException('Fatura já está paga');

    // Create a transaction that does NOT impact DRE individually because its contents do
    const pagamento = await this.prisma.lancamentoFinanceiro.create({
      data: {
        descricao: `Pagamento Fatura Cartão`,
        valor: fatura.valorTotal,
        dataVencimento: fatura.dataVencimento,
        dataPagamento,
        tipo: 'DESPESA',
        status: 'REALIZADO',
        contaBancariaId,
        // Critical Rule: DRE should use CartaoTransacoes exclusively, no need to link DRE logic to this generic lancamento.
        // I won't set categoriaId or set it to 'PAGAMENTO_CARTAO' that is explicitly excluded from DRE grouping.
        observacoes: 'Gerado automaticamente pelo pagamento da fatura'
      }
    });

    await (this.prisma as any).faturaCartao.update({
      where: { id: faturaId },
      data: {
        status: 'PAGA',
        lancamentoPagamentoId: pagamento.id
      }
    });

    await (this.prisma as any).cartaoTransacao.updateMany({
      where: { faturaId },
      data: { status: 'PAGO' }
    });

    return { message: 'Fatura Paga com Sucesso', pagamentoId: pagamento.id };
  }

  async syncFromInter(contaBancariaId: string) {
    const integration = await this.prisma.integracaoBancaria.findUnique({
      where: { contaBancariaId },
      include: { contaBancaria: true }
    });

    if (!integration || integration.status !== 'CONNECTED') {
      throw new BadRequestException('Integração não configurada ou desconectada');
    }

    if (!fs.existsSync(integration.crtFile!) || !fs.existsSync(integration.keyFile!)) {
      throw new BadRequestException('Certificados não encontrados no servidor.');
    }

    const certContent = fs.readFileSync(integration.crtFile!);
    const keyContent = fs.readFileSync(integration.keyFile!);

    // 1. Get Token for Credit Cards
    const token = await this.bankingIntegrationService.getAccessToken(
      integration.clientId!,
      integration.clientSecret!,
      certContent,
      keyContent,
      'cartao.read'
    );
    console.log('Token obtained');

    // 2. Fetch Cards
    const cardsResponse = await this.bankingIntegrationService.fetchInterCards(token, certContent, keyContent);
    console.log('Cards Response:', JSON.stringify(cardsResponse));
    const cardsData = cardsResponse.cartoes || cardsResponse;

    if (!cardsData || cardsData.length === 0) {
      return { message: 'Nenhum cartão encontrado nesta conta' };
    }

    // 3. Fetch Transactions for the last card (usually the main one)
    const card = cardsData[0];
    const cardId = card.nossoNumero || card.id;
    console.log('Using cardId:', cardId);
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const transactionsResponse = await this.bankingIntegrationService.fetchInterCreditCardTransactions(
      token,
      cardId,
      startDate,
      endDate,
      certContent,
      keyContent
    );

    const interTransactions = transactionsResponse.transacoes || [];
    let imported = 0;

    // 4. Process and Save
    for (const it of interTransactions) {
      const dataCompra = new Date(it.data);
      const valor = Math.abs(parseFloat(it.valor));
      const descricao = it.estabelecimento || it.descricao;

      // Check if already exists by description, date and value (basic deduplication)
      const existing = await (this.prisma as any).cartaoTransacao.findFirst({
        where: {
          descricao,
          dataCompra,
          valor
        }
      });

      if (!existing) {
        const classificado = await this.classificationEngine.classificarTransacao(descricao);
        await (this.prisma as any).cartaoTransacao.create({
          data: {
            cartaoId: 'INTER-' + cardId,
            descricao,
            valor,
            dataCompra,
            dataCompetencia: dataCompra,
            categoriaId: classificado.categoriaId,
            subcategoriaId: classificado.subcategoriaId,
            confiancaClassificacao: classificado.confianca,
            status: 'FATURADO'
          }
        });
        imported++;
      }
    }

    return { 
      message: `Sincronização concluída. ${imported} novas transações importadas.`,
      found: interTransactions.length
    };
  }
}
