import { Module } from '@nestjs/common';
import { BankingIntegrationService } from './banking-integration.service';
import { BankingIntegrationController } from './banking-integration.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';

import { OfxService } from './ofx.service';
import { CryptoService } from '../../shared/crypto.service';

@Module({
  imports: [ReconciliationModule],
  controllers: [BankingIntegrationController],
  providers: [BankingIntegrationService, PrismaService, OfxService, CryptoService],
  exports: [BankingIntegrationService],
})
export class BankingIntegrationModule {}
