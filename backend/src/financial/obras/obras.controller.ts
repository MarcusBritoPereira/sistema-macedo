import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ObrasService } from './obras.service';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('financial/obras')
export class ObrasController {
  constructor(private readonly obrasService: ObrasService) {}

  @Post()
  @RequirePermissions('financeiro.obras.write')
  create(@Body() createObraDto: CreateObraDto) {
    return this.obrasService.create(createObraDto);
  }

  @Get('template/csv')
  @RequirePermissions('financeiro.obras.read')
  getTemplate(@Res() res: Response) {
    return this.obrasService.getTemplate(res);
  }

  @Post('import')
  @RequirePermissions('financeiro.obras.write')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    return this.obrasService.importCsv(file);
  }

  @Get()
  @RequirePermissions('financeiro.obras.read')
  findAll() {
    return this.obrasService.findAll();
  }

  @Get(':id')
  @RequirePermissions('financeiro.obras.read')
  findOne(@Param('id') id: string) {
    return this.obrasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('financeiro.obras.write')
  update(@Param('id') id: string, @Body() updateObraDto: UpdateObraDto) {
    return this.obrasService.update(id, updateObraDto);
  }

  @Delete(':id')
  @RequirePermissions('financeiro.obras.delete')
  remove(@Param('id') id: string) {
    return this.obrasService.remove(id);
  }

  @Post(':id/parcelas')
  @RequirePermissions('financeiro.obras.write')
  createParcela(@Param('id') id: string, @Body() body: any) {
    return this.obrasService.createParcela(id, body);
  }

  @Get(':id/parcelas')
  @RequirePermissions('financeiro.obras.read')
  findParcelas(@Param('id') id: string) {
    return this.obrasService.findParcelas(id);
  }

  @Patch('parcelas/:parcelaId')
  @RequirePermissions('financeiro.obras.write')
  updateParcela(@Param('parcelaId') parcelaId: string, @Body() body: any) {
    return this.obrasService.updateParcela(parcelaId, body);
  }

  @Post('parcelas/:parcelaId/lancar-contas-receber')
  @RequirePermissions('financeiro.obras.write')
  lancarParcelaContasReceber(
    @Param('parcelaId') parcelaId: string,
    @Req() req: any,
  ) {
    return this.obrasService.lancarParcelaContasReceber(parcelaId, req.user.id);
  }

  @Post(':id/parcelas/lancar-contas-receber')
  @RequirePermissions('financeiro.obras.write')
  lancarTodasParcelasContasReceber(@Param('id') id: string, @Req() req: any) {
    return this.obrasService.lancarTodasParcelasContasReceber(id, req.user.id);
  }

  @Delete('parcelas/:parcelaId')
  @RequirePermissions('financeiro.obras.delete')
  removeParcela(@Param('parcelaId') parcelaId: string) {
    return this.obrasService.removeParcela(parcelaId);
  }
}
