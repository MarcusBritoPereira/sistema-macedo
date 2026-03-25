import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFile, Put, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreditCardsService } from './credit-cards.service';

@Controller('financial/credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importInvoice(@UploadedFile() file: Express.Multer.File, @Body('cartaoId') cartaoId?: string) {
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }
    const csvData = file.buffer.toString('utf-8');
    return this.creditCardsService.importarFaturaCSV(csvData, cartaoId);
  }

  @Get('invoices')
  async getInvoices() {
    return this.creditCardsService.getInvoices();
  }

  @Get('invoices/:id/transactions')
  async getTransactions(@Param('id') invoiceId: string) {
    return this.creditCardsService.getTransactions(invoiceId);
  }

  @Get('transactions')
  async getAllTransactions(@Query('cartaoId') cartaoId?: string, @Query('startDate') start?: string, @Query('endDate') end?: string) {
    return this.creditCardsService.getAllTransactions({
      cartaoId,
      startDate: start ? new Date(start) : undefined,
      endDate: end ? new Date(end) : undefined
    });
  }

  @Post('transactions/:id/link')
  async linkToEntry(@Param('id') txId: string, @Body('entryId') entryId: string) {
    return this.creditCardsService.linkToFinancialEntry(txId, entryId);
  }

  @Put('transactions/classify-batch')
  async classifyBatch(@Body() dto: { ids: string[], categoriaId?: string, subcategoriaId?: string, centroCustoId?: string }) {
    return this.creditCardsService.classificarLote(dto.ids, {
      categoriaId: dto.categoriaId,
      subcategoriaId: dto.subcategoriaId,
      centroCustoId: dto.centroCustoId
    });
  }

  @Post('invoices/:id/pay')
  async payInvoice(@Param('id') invoiceId: string, @Body() dto: { contaBancariaId: string, dataPagamento: string }) {
    return this.creditCardsService.pagarFatura(invoiceId, dto.contaBancariaId, new Date(dto.dataPagamento));
  }

  @Post('rules/learn')
  async applyAutoRules(@Body() dto: { transactionsIds: string[] }) {
    return this.creditCardsService.applyAutoRules(dto.transactionsIds);
  }

  @Post('sync-inter/:contaId')
  async syncInter(@Param('contaId') contaId: string) {
    return this.creditCardsService.syncFromInter(contaId);
  }
}
