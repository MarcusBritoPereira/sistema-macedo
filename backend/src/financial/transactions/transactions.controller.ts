import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FinancialTransactionsService } from './transactions.service';
import { Prisma, TipoLancamento, StatusLancamento } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('financial/transactions')
@UseGuards(AuthGuard('jwt'))
export class FinancialTransactionsController {
  constructor(
    private readonly transactionsService: FinancialTransactionsService,
  ) {}

  @Post()
  create(
    @Body() createDto: Prisma.LancamentoFinanceiroCreateInput,
    @Req() req: any,
  ) {
    return this.transactionsService.create(createDto, req.user.id);
  }

  @Post('bulk')
  createMany(
    @Body() createDto: Prisma.LancamentoFinanceiroCreateManyInput[],
    @Req() req: any,
  ) {
    return this.transactionsService.createMany(createDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('type') type?: TipoLancamento,
    @Query('tipo') tipo?: TipoLancamento,
    @Query('status') status?: StatusLancamento,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const normalizedSkip = Math.max(0, Number(skip) || 0);
    const maxTake = Number(process.env.FINANCIAL_MAX_PAGE_SIZE || 500);
    const safeMaxTake = Number.isFinite(maxTake) && maxTake > 0 ? maxTake : 500;
    const normalizedTake = Math.min(Math.max(1, Number(take) || 50), safeMaxTake);

    // Handle both 'tipo' (from frontend) and 'type' (REST convention)
    const finalType = tipo || type;

    return this.transactionsService.findAll({
      type: finalType,
      status,
      startDate,
      endDate,
      categoryId,
      search,
      skip: normalizedSkip,
      take: normalizedTake,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: Prisma.LancamentoFinanceiroUpdateInput,
    @Req() req: any,
  ) {
    return this.transactionsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.transactionsService.remove(id, req.user.id);
  }
}
