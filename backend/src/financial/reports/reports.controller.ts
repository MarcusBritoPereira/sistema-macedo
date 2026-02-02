import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto';

@Controller('financial/reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get()
  getReports() {
    return this.reportsService.getCatalog();
  }

  @Post('generate')
  generateReports(@Body() payload: ReportGenerationRequestDto) {
    return this.reportsService.generate(payload);
  }
}
