import { Module } from '@nestjs/common';
import { RateioService } from './rateio.service';
import { RateioController } from './rateio.controller';
import { DreModule } from '../dre/dre.module';

@Module({
  imports: [DreModule],
  controllers: [RateioController],
  providers: [RateioService],
  exports: [RateioService],
})
export class RateioModule {}
