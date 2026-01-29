
import { Controller, Get, Post, Body, Query, Param, Delete } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';

@Controller('financial/reconciliation')
export class ReconciliationController {
    constructor(private readonly service: ReconciliationService) { }

    @Get('statements/:contaBancariaId')
    getStatements(
        @Param('contaBancariaId') contaBancariaId: string,
        @Query() filters: any
    ) {
        return this.service.getBankStatements(contaBancariaId, filters);
    }

    @Get('suggested-matches/:statementId')
    getSuggestedMatches(@Param('statementId') statementId: string) {
        return this.service.findSuggestedMatches(statementId);
    }

    @Post('link')
    linkManual(@Body() data: { statementId: string; lancamentoId: string }) {
        return this.service.linkManual(data.statementId, data.lancamentoId);
    }

    @Post('create-and-link')
    createAndLink(@Body() data: { statementId: string; lancamentoId?: string;[key: string]: any }) {
        const { statementId, ...rest } = data;
        return this.service.createAndLink(statementId, rest);
    }

    @Delete('unlink/:conciliacaoId')
    unlink(@Param('conciliacaoId') conciliacaoId: string) {
        return this.service.unlink(conciliacaoId);
    }
}
