import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { CashFlowService } from './cash-flow.service';
import { CashFlowController } from './cash-flow.controller';
import { DreModule } from './dre/dre.module';
import { RateioModule } from './rateio/rateio.module';

import { CategoriesModule } from './categories/categories.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { FinancialDashboardController } from './dashboard/financial-dashboard.controller';
import { FinancialDashboardService } from './dashboard/financial-dashboard.service';
import { FinancialTransactionsModule } from './transactions/transactions.module';

import { BankingIntegrationModule } from './banking-integration/banking-integration.module';

import { BankAccountsController } from './bank-accounts.controller';

import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { FinancialBudgetModule } from './budget/financial-budget.module';
import { RecurringModule } from './recurring/recurring.module';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { FinancialCacheInterceptor } from '../common/interceptors/financial-cache.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ObrasModule } from './obras/obras.module';

@Module({
  providers: [
    FinancialService,
    CashFlowService,
    FinancialDashboardService,
    ReportsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: FinancialCacheInterceptor,
    },
  ],
  controllers: [
    FinancialController,
    BankAccountsController,
    CashFlowController,
    FinancialDashboardController,
    ReportsController,
  ],
  imports: [
    CategoriesModule,
    CostCentersModule,
    FinancialTransactionsModule,
    BankingIntegrationModule,
    ReconciliationModule,
    FinancialBudgetModule,
    RecurringModule,
    DreModule,
    RateioModule,
    ObrasModule,
  ],
})
export class FinancialModule {}
