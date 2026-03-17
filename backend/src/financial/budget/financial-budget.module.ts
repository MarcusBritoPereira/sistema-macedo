import { Module } from '@nestjs/common';
import { FinancialBudgetService } from './financial-budget.service';
import { FinancialBudgetController } from './financial-budget.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialBudgetController],
  providers: [FinancialBudgetService],
  exports: [FinancialBudgetService],
})
export class FinancialBudgetModule {}
