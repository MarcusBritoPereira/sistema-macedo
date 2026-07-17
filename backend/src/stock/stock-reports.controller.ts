import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { StockReportsService } from './services/stock-reports.service';

@Controller('stock/reports')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockReportsController {
  constructor(private readonly service: StockReportsService) {}

  @Get('position')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  position(@Query() query: PaginationQueryDto & any) {
    return this.service.position(query);
  }

  @Get('movements')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  movements(@Query() query: PaginationQueryDto & any) {
    return this.service.movements(query);
  }

  @Get('consumption-by-project')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  consumptionByProject(@Query() query: PaginationQueryDto & any) {
    return this.service.consumptionByProject(query);
  }

  @Get('losses')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  losses(@Query() query: PaginationQueryDto & any) {
    return this.service.losses(query);
  }

  @Get('abc')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  abc(@Query() query: PaginationQueryDto & any) {
    return this.service.abc(query);
  }

  @Get('purchase-suggestion')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  purchaseSuggestion(@Query() query: PaginationQueryDto & any) {
    return this.service.purchaseSuggestion(query);
  }
}
