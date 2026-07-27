import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { StockCategoriesService } from './services/stock-categories.service';
import { CreateStockCategoryDto } from './dto/create-stock-category.dto';
import { UpdateStockCategoryDto } from './dto/update-stock-category.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('stock/categories')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockCategoriesController {
  constructor(private readonly service: StockCategoriesService) {}

  @Post()
  @RequirePermissions('ESTOQUE_CONFIGURACOES')
  create(@Body() dto: CreateStockCategoryDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get('tree')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findTree() {
    return this.service.findTree();
  }

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ESTOQUE_CONFIGURACOES')
  update(@Param('id') id: string, @Body() dto: UpdateStockCategoryDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('ESTOQUE_CONFIGURACOES')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}
