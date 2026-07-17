import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusReservaEstoque, StatusSolicitacaoMaterial } from '@prisma/client';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ApproveStockRequestDto } from './dto/approve-stock-request.dto';
import { CreateStockRequestDto } from './dto/create-stock-request.dto';
import { FulfillStockRequestDto } from './dto/fulfill-stock-request.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { RejectStockRequestDto } from './dto/reject-stock-request.dto';
import { StockRequestsService } from './services/stock-requests.service';

@Controller('stock/requests')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockRequestsController {
  constructor(private readonly service: StockRequestsService) {}

  @Post()
  @RequirePermissions('ESTOQUE_SOLICITAR')
  create(@Body() dto: CreateStockRequestDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: PaginationQueryDto & { status?: StatusSolicitacaoMaterial; obraId?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ESTOQUE_SOLICITAR')
  updateDraft(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/submit')
  @RequirePermissions('ESTOQUE_SOLICITAR')
  submit(@Param('id') id: string, @Req() req: any) {
    return this.service.submit(id, req.user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('ESTOQUE_SOLICITACAO_APROVAR')
  approve(@Param('id') id: string, @Body() dto: ApproveStockRequestDto, @Req() req: any) {
    return this.service.approve(id, dto, req.user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('ESTOQUE_SOLICITACAO_APROVAR')
  reject(@Param('id') id: string, @Body() dto: RejectStockRequestDto, @Req() req: any) {
    return this.service.reject(id, dto.motivo, req.user.id);
  }

  @Post(':id/fulfill')
  @RequirePermissions('ESTOQUE_TRANSFERIR')
  fulfill(@Param('id') id: string, @Body() dto: FulfillStockRequestDto, @Req() req: any) {
    return this.service.fulfill(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('ESTOQUE_SOLICITAR')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.service.cancel(id, req.user.id);
  }
}

@Controller('stock/reservations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StockReservationsController {
  constructor(private readonly service: StockRequestsService) {}

  @Get()
  @RequirePermissions('ESTOQUE_VISUALIZAR')
  findAll(@Query() query: PaginationQueryDto & { status?: StatusReservaEstoque; obraId?: string; materialId?: string }) {
    return this.service.reservations(query);
  }
}
