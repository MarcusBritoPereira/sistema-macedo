import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusInventarioEstoque } from '@prisma/client';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CountStockInventoryDto } from './dto/count-stock-inventory.dto';
import { CreateStockInventoryDto } from './dto/create-stock-inventory.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { StockInventoriesService } from './services/stock-inventories.service';

@Controller('stock/inventories')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockInventoriesController {
  constructor(private readonly service: StockInventoriesService) {}

  @Post()
  @RequirePermissions('ESTOQUE_INVENTARIO_CRIAR')
  create(@Body() dto: CreateStockInventoryDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: PaginationQueryDto & { status?: StatusInventarioEstoque; localEstoqueId?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/count')
  @RequirePermissions('ESTOQUE_INVENTARIO_CRIAR')
  count(@Param('id') id: string, @Body() dto: CountStockInventoryDto, @Req() req: any) {
    return this.service.count(id, dto, req.user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('ESTOQUE_INVENTARIO_APROVAR')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.service.approve(id, req.user.id);
  }

  @Post(':id/close')
  @RequirePermissions('ESTOQUE_INVENTARIO_APROVAR')
  close(@Param('id') id: string, @Req() req: any) {
    return this.service.close(id, req.user.id);
  }
}
