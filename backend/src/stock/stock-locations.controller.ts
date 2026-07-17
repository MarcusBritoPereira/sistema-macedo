import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { StockLocationsService } from './services/stock-locations.service';
import { CreateStockLocationDto } from './dto/create-stock-location.dto';
import { UpdateStockLocationDto } from './dto/update-stock-location.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('stock/locations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockLocationsController {
  constructor(private readonly service: StockLocationsService) {}

  @Post()
  @RequirePermissions('ESTOQUE_LOCAL_GERENCIAR')
  create(@Body() dto: CreateStockLocationDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: PaginationQueryDto & { tipo?: string; obraId?: string; ativo?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ESTOQUE_LOCAL_GERENCIAR')
  update(@Param('id') id: string, @Body() dto: UpdateStockLocationDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('ESTOQUE_LOCAL_GERENCIAR')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}
