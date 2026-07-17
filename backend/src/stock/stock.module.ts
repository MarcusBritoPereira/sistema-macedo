import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { StockCostingService } from './services/stock-costing.service';
import { StockMovementService } from './services/stock-movement.service';
import { StockCategoriesService } from './services/stock-categories.service';
import { StockMaterialsService } from './services/stock-materials.service';
import { StockLocationsService } from './services/stock-locations.service';
import { StockBalancesService } from './services/stock-balances.service';
import { StockDocumentsService } from './services/stock-documents.service';
import { StockFinancialIntegrationService } from './services/stock-financial-integration.service';
import { StockRequestsService } from './services/stock-requests.service';
import { StockInventoriesService } from './services/stock-inventories.service';
import { StockBudgetsService } from './services/stock-budgets.service';
import { StockReportsService } from './services/stock-reports.service';
import { StockCategoriesController } from './stock-categories.controller';
import { StockMaterialsController } from './stock-materials.controller';
import { StockLocationsController } from './stock-locations.controller';
import { StockBalancesController } from './stock-balances.controller';
import { StockEntriesController } from './stock-entries.controller';
import { StockIssuesController } from './stock-issues.controller';
import { StockTransfersController } from './stock-transfers.controller';
import { StockFinancialController } from './stock-financial.controller';
import { StockRequestsController, StockReservationsController } from './stock-requests.controller';
import { StockInventoriesController } from './stock-inventories.controller';
import { StockBudgetsController } from './stock-budgets.controller';
import { StockReportsController } from './stock-reports.controller';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [
    StockCategoriesController,
    StockMaterialsController,
    StockLocationsController,
    StockBalancesController,
    StockEntriesController,
    StockIssuesController,
    StockTransfersController,
    StockFinancialController,
    StockRequestsController,
    StockReservationsController,
    StockInventoriesController,
    StockBudgetsController,
    StockReportsController,
  ],
  providers: [
    StockCostingService,
    StockMovementService,
    StockCategoriesService,
    StockMaterialsService,
    StockLocationsService,
    StockBalancesService,
    StockDocumentsService,
    StockFinancialIntegrationService,
    StockRequestsService,
    StockInventoriesService,
    StockBudgetsService,
    StockReportsService,
  ],
  exports: [StockCostingService, StockMovementService],
})
export class StockModule {}
