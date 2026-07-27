import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TipoDocumentoEstoque } from '@prisma/client';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CancelStockDocumentDto } from './dto/cancel-stock-document.dto';
import { CreateStockDocumentDto } from './dto/create-stock-document.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { StockDocumentsService } from './services/stock-documents.service';

@Controller('stock/issues')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockIssuesController {
  constructor(private readonly documents: StockDocumentsService) {}

  @Post()
  @RequirePermissions('ESTOQUE_SAIDA_CRIAR')
  create(@Body() dto: CreateStockDocumentDto, @Req() req: any) {
    return this.documents.create(TipoDocumentoEstoque.SAIDA, dto, req.user.id);
  }

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: PaginationQueryDto) {
    return this.documents.findAll(TipoDocumentoEstoque.SAIDA, query);
  }

  @Get(':id')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findOne(@Param('id') id: string) {
    return this.documents.findOne(id);
  }

  @Post(':id/approve')
  @RequirePermissions('ESTOQUE_SAIDA_APROVAR')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.documents.approve(id, req.user.id);
  }

  @Post(':id/post')
  @RequirePermissions('ESTOQUE_SAIDA_APROVAR')
  post(@Param('id') id: string, @Req() req: any) {
    return this.documents.post(id, req.user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('ESTOQUE_SAIDA_APROVAR')
  cancel(@Param('id') id: string, @Body() dto: CancelStockDocumentDto, @Req() req: any) {
    return this.documents.cancel(id, req.user.id, dto.motivo);
  }
}
