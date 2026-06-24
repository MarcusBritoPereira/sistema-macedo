import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CashFlowService } from './cash-flow.service';
import { CashFlowFilterDto } from './dto/cash-flow-filter.dto';

@Controller('financial/cash-flow')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('financeiro.fluxo_caixa.read')
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Get()
  async getCashFlow(@Query() filter: CashFlowFilterDto) {
    return this.cashFlowService.getCashFlow(filter);
  }
}
