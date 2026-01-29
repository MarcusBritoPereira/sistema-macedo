import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { FinancialModule } from './financial/financial.module';
import { ContractsModule } from './contracts/contracts.module';


@Module({
  imports: [
    UsersModule,
    AuthModule,
    PrismaModule,
    AuditLogModule,
    ClientsModule,
    FinancialModule,
    ContractsModule,
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
