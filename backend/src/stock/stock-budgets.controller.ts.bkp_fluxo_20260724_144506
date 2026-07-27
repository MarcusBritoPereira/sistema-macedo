import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusOrcamentoMaterialObra } from '@prisma/client';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateStockBudgetDto } from './dto/create-stock-budget.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { StockBudgetsService } from './services/stock-budgets.service';

@Controller('stock/budgets')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockBudgetsController {
  constructor(private readonly service: StockBudgetsService) {}

  @Post()
  @RequirePermissions('ESTOQUE_CONFIGURACOES')
  create(@Body() dto: CreateStockBudgetDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('ESTOQUE_RELATORIOS')
  findAll(@Query() query: PaginationQueryDto & { status?: StatusOrcamentoMaterialObra; obraId?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/approve')
  @RequirePermissions('ESTOQUE_CONFIGURACOES')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.service.approve(id, req.user.id);
  }

  @Get(':id/actual-vs-budget')
  @RequirePermissions('ESTOQUE_RELATORIOS')
  actualVsBudget(@Param('id') id: string) {
    return this.service.actualVsBudget(id);
  }
}
