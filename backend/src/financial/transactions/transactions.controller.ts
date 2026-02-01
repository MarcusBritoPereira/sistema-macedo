import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { FinancialTransactionsService } from './transactions.service';
import { Prisma, TipoLancamento, StatusLancamento } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('financial/transactions')
@UseGuards(AuthGuard('jwt'))
export class FinancialTransactionsController {
    constructor(private readonly transactionsService: FinancialTransactionsService) { }

    @Post()
    create(@Body() createDto: Prisma.LancamentoFinanceiroCreateInput, @Req() req: any) {
        return this.transactionsService.create(createDto, req.user.id);
    }

    @Get()
    findAll(
        @Query('type') type?: TipoLancamento,
        @Query('status') status?: StatusLancamento,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
    ) {
        const normalizedSkip = Math.max(0, Number(skip) || 0);
        const normalizedTake = Math.min(Math.max(1, Number(take) || 50), 200);
        return this.transactionsService.findAll(type, status, normalizedSkip, normalizedTake);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.transactionsService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateDto: Prisma.LancamentoFinanceiroUpdateInput,
        @Req() req: any
    ) {
        return this.transactionsService.update(id, updateDto, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.transactionsService.remove(id, req.user.id);
    }
}
