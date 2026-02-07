
import { Module } from '@nestjs/common';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';

@Module({
    imports: [PrismaModule, AuditLogModule],
    controllers: [ReconciliationController],
    providers: [ReconciliationService],
    exports: [ReconciliationService]
})
export class ReconciliationModule { }
