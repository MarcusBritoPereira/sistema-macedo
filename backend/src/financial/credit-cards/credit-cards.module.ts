import { Module } from '@nestjs/common';
import { CreditCardsController } from './credit-cards.controller';
import { CreditCardsService } from './credit-cards.service';
import { ClassificationEngineService } from './classification-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditCardsController],
  providers: [CreditCardsService, ClassificationEngineService],
  exports: [CreditCardsService]
})
export class CreditCardsModule {}
