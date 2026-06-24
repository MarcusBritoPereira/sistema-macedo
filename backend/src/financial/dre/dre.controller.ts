import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { DreService } from './dre.service';
import { GerarDreDto } from './dto/gerar-dre.dto';
import { DREDetalhesDto } from './dto/dre-detalhes.dto';

@Controller('financial/dre')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('financeiro.dre.read')
export class DreController {
  constructor(private readonly dreService: DreService) {}

  @Post()
  gerar(@Body() dto: GerarDreDto) {
    return this.dreService.gerar(dto);
  }

  @Get('detalhes')
  obterDetalhes(@Query() dto: DREDetalhesDto) {
    return this.dreService.obterDetalhesDRE(dto);
  }
}
