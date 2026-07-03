import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

@Controller('financial/reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReports() {
    return this.reportsService.getCatalog();
  }

  @Post('generate')
  generateReports(@Body() payload: ReportGenerationRequestDto) {
    return this.reportsService.generate(payload);
  }

  @Get('dashboard')
  getDashboardData(@Query() filters: DashboardFilterDto) {
    return this.reportsService.getDashboardData(filters);
  }
}
