import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { StockBalancesService } from './services/stock-balances.service';
import { StockBalanceQueryDto } from './dto/stock-balance-query.dto';

@Controller('stock/balances')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockBalancesController {
  constructor(private readonly service: StockBalancesService) {}

  @Get('summary')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  summary() {
    return this.service.summary();
  }

  @Get('low-stock')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  lowStock(@Query() query: StockBalanceQueryDto) {
    return this.service.lowStock(query);
  }

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: StockBalanceQueryDto) {
    return this.service.findAll(query);
  }
}
