import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { ReportsService } from './reports.service';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto';

@Controller('financial/reports')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('financeiro.relatorios.read')
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
}
