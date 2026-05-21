import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
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
}
