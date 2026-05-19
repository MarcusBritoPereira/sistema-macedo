import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RateioService } from './rateio.service';
import { CreateRateiosBatchDto } from './dto/create-rateio.dto';

@Controller('financial/transactions/:id/rateios')
@UseGuards(AuthGuard('jwt'))
export class RateioController {
  constructor(private readonly rateioService: RateioService) {}

  @Get()
  findByLancamento(@Param('id') id: string) {
    return this.rateioService.findByLancamento(id);
  }

  @Post()
  saveBatch(
    @Param('id') id: string,
    @Body() body: CreateRateiosBatchDto,
    @Req() req: any,
  ) {
    return this.rateioService.saveBatch(id, body.rateios, req.user?.id);
  }
}
