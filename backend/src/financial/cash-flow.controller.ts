import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CashFlowService } from './cash-flow.service';
import { CashFlowFilterDto } from './dto/cash-flow-filter.dto';

@Controller('financial/cash-flow')
@UseGuards(AuthGuard('jwt'))
export class CashFlowController {
    constructor(private readonly cashFlowService: CashFlowService) { }

    @Get()
    async getCashFlow(@Query() filter: CashFlowFilterDto) {
        return this.cashFlowService.getCashFlow(filter);
    }
}
