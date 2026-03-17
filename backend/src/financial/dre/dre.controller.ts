import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DreService } from './dre.service';
import { GerarDreDto } from './dto/gerar-dre.dto';

@Controller('financial/dre')
@UseGuards(AuthGuard('jwt'))
export class DreController {
  constructor(private readonly dreService: DreService) {}

  @Post()
  gerar(@Body() dto: GerarDreDto) {
    return this.dreService.gerar(dto);
  }
}
