import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { StockFinancialIntegrationService } from './services/stock-financial-integration.service';

@Controller('stock/financial')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockFinancialController {
  constructor(private readonly financialIntegration: StockFinancialIntegrationService) {}

  @Get('appropriations')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  appropriations(
    @Query('obraId') obraId?: string,
    @Query('materialId') materialId?: string,
    @Query('centroCustoId') centroCustoId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.financialIntegration.consumptionAppropriations({
      obraId,
      materialId,
      centroCustoId,
      startDate,
      endDate,
      skip,
      take,
    });
  }
}
