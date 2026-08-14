import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { StockBalancesService } from './services/stock-balances.service';
import { StockBalanceQueryDto } from './dto/stock-balance-query.dto';
import { AdjustStockBalanceDto } from './dto/adjust-stock-balance.dto';

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

  @Post('adjust')
  @RequirePermissions('ESTOQUE_ENTRADA_CRIAR')
  adjust(@Body() dto: AdjustStockBalanceDto, @Req() req: any) {
    return this.service.adjust(dto, req.user.id);
  }
}
