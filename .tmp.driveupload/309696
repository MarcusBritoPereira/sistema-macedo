import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FinancialBudgetService } from './financial-budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('financial/budget')
@UseGuards(AuthGuard('jwt'))
export class FinancialBudgetController {
  constructor(private readonly service: FinancialBudgetService) {}

  @Post()
  upsert(@Body() createBudgetDto: CreateBudgetDto) {
    return this.service.upsert(createBudgetDto);
  }

  @Get('template/csv')
  getTemplate(@Res() res: Response) {
    return this.service.getTemplate(res);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    return this.service.importCsv(file);
  }

  @Get()
  findAll(@Query('ano') ano: string) {
    return this.service.findAll(ano ? parseInt(ano) : undefined);
  }
}
