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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

@Controller('financial/cost-centers')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('financeiro.centros_custo.read')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @RequirePermissions('financeiro.centros_custo.write')
  create(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.create(createCostCenterDto);
  }

  @Get('template/csv')
  getTemplate(@Res() res: Response) {
    return this.costCentersService.getTemplate(res);
  }

  @Post('import')
  @RequirePermissions('financeiro.centros_custo.write')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    return this.costCentersService.importCsv(file);
  }

  @Get()
  findAll() {
    return this.costCentersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.costCentersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('financeiro.centros_custo.write')
  update(
    @Param('id') id: string,
    @Body() updateCostCenterDto: UpdateCostCenterDto,
  ) {
    return this.costCentersService.update(id, updateCostCenterDto);
  }

  @Delete(':id')
  @RequirePermissions('financeiro.centros_custo.delete')
  remove(@Param('id') id: string) {
    return this.costCentersService.remove(id);
  }
}
