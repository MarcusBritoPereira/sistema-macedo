import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FinancialBudgetService } from './financial-budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';

@Controller('financial/budget')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('financeiro.orcamento.read')
export class FinancialBudgetController {
  constructor(private readonly service: FinancialBudgetService) {}

  @Post()
  @RequirePermissions('financeiro.orcamento.write')
  upsert(@Body() createBudgetDto: CreateBudgetDto) {
    return this.service.upsert(createBudgetDto);
  }

  @Get('template/csv')
  getTemplate(@Res() res: Response) {
    return this.service.getTemplate(res);
  }

  @Post('import')
  @RequirePermissions('financeiro.orcamento.write')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    return this.service.importCsv(file);
  }

  @Get()
  findAll(@Query('ano') ano: string) {
    return this.service.findAll(ano ? parseInt(ano) : undefined);
  }
}
