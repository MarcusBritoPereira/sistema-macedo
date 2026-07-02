import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinancialDashboardService } from './financial-dashboard.service';

@Controller('financial/dashboard')
@UseGuards(AuthGuard('jwt'))
export class FinancialDashboardController {
  constructor(private readonly dashboardService: FinancialDashboardService) {}

  @Get('dre')
  getDRE(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    return this.dashboardService.getDRE(start, end);
  }

  @Get('executive')
  getExecutiveDashboard(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.dashboardService.getExecutiveDashboard(m, y);
  }

  @Get('operational')
  getOperationalDashboard() {
    return this.dashboardService.getOperationalDashboard();
  }

  @Get('summary')
  getSummaryDashboard(@Query('year') year?: string, @Query('month') month?: string) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month !== undefined ? parseInt(month) : new Date().getMonth();
    return this.dashboardService.getSummaryDashboard(y, m);
  }

  @Get('cash-flow')
  getCashFlowDashboard(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const m = month ? parseInt(month) : undefined;
    const y = year ? parseInt(year) : undefined;
    return this.dashboardService.getCashFlowDashboard(m, y);
  }

  @Get('balance')
  getBalanceSheet(@Query('asOf') asOf: string) {
    const referenceDate = asOf ? new Date(asOf) : new Date();
    return this.dashboardService.getBalanceSheet(referenceDate);
  }
}
