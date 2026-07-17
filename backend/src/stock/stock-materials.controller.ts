import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { StockMaterialsService } from './services/stock-materials.service';
import { CreateStockMaterialDto } from './dto/create-stock-material.dto';
import { UpdateStockMaterialDto } from './dto/update-stock-material.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('stock/materials')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockMaterialsController {
  constructor(private readonly service: StockMaterialsService) {}

  @Post()
  @RequirePermissions('ESTOQUE_MATERIAL_CRIAR')
  create(@Body() dto: CreateStockMaterialDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: PaginationQueryDto & { categoriaMaterialId?: string; ativo?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/balances')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  balances(@Param('id') id: string) {
    return this.service.balances(id);
  }

  @Get(':id/movements')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  movements(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.service.movements(id, query);
  }

  @Patch(':id')
  @RequirePermissions('ESTOQUE_MATERIAL_EDITAR')
  update(@Param('id') id: string, @Body() dto: UpdateStockMaterialDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('ESTOQUE_MATERIAL_EDITAR')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}
