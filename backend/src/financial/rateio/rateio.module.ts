import { Module } from '@nestjs/common';
import { RateioService } from './rateio.service';
import { RateioController } from './rateio.controller';

@Module({
  controllers: [RateioController],
  providers: [RateioService],
  exports: [RateioService],
})
export class RateioModule {}
