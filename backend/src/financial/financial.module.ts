import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { CashFlowService } from './cash-flow.service';
import { CashFlowController } from './cash-flow.controller';

import { CategoriesModule } from './categories/categories.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { FinancialDashboardController } from './dashboard/financial-dashboard.controller';
import { FinancialDashboardService } from './dashboard/financial-dashboard.service';
import { FinancialTransactionsModule } from './transactions/transactions.module';

import { BankingIntegrationModule } from './banking-integration/banking-integration.module';

import { BankAccountsController } from './bank-accounts.controller';

import { ReconciliationModule } from './reconciliation/reconciliation.module';

@Module({
  providers: [FinancialService, CashFlowService, FinancialDashboardService],
  controllers: [FinancialController, BankAccountsController, CashFlowController, FinancialDashboardController],
  imports: [CategoriesModule, CostCentersModule, FinancialTransactionsModule, BankingIntegrationModule, ReconciliationModule]
})
export class FinancialModule { }
