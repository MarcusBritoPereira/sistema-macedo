import { Module } from '@nestjs/common';
import { ParametroFiscalService } from './parameters/parametro-fiscal.service';
import { ParametroFiscalController } from './parameters/parametro-fiscal.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParametroFiscalController],
  providers: [ParametroFiscalService],
  exports: [ParametroFiscalService],
})
export class FiscalModule {}
