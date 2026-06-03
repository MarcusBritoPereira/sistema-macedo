import { Module } from '@nestjs/common';
import { FinancialTransactionsService } from './transactions.service';
import { FinancialTransactionsController } from './transactions.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialTransactionsController],
  providers: [FinancialTransactionsService],
  exports: [FinancialTransactionsService],
})
export class FinancialTransactionsModule {}
