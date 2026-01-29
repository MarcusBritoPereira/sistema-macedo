
import { Module } from '@nestjs/common';
import { BankingIntegrationService } from './banking-integration.service';
import { BankingIntegrationController } from './banking-integration.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [BankingIntegrationController],
    providers: [BankingIntegrationService, PrismaService],
    exports: [BankingIntegrationService]
})
export class BankingIntegrationModule { }
