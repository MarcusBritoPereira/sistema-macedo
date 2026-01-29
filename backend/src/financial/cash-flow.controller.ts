import { Controller, Get, Query } from '@nestjs/common';
import { CashFlowService } from './cash-flow.service';
import { CashFlowFilterDto } from './dto/cash-flow-filter.dto';

@Controller('financial/cash-flow')
export class CashFlowController {
    constructor(private readonly cashFlowService: CashFlowService) { }

    @Get()
    async getCashFlow(@Query() filter: CashFlowFilterDto) {
        return this.cashFlowService.getCashFlow(filter);
    }
}
