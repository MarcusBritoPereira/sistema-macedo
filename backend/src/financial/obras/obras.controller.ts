import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
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
