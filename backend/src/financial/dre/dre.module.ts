import { Module } from '@nestjs/common';
import { DreService } from './dre.service';
import { DreController } from './dre.controller';

@Module({
  controllers: [DreController],
  providers: [DreService],
  exports: [DreService],
})
export class DreModule {}
