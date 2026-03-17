import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReconciliationService } from './reconciliation.service';

@Controller('financial/reconciliation')
@UseGuards(AuthGuard('jwt'))
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  @Get('statements/:contaBancariaId')
  getStatements(
    @Param('contaBancariaId') contaBancariaId: string,
    @Query() filters: any,
  ) {
    return this.service.getBankStatements(contaBancariaId, filters);
  }

  @Get('suggested-matches/:statementId')
  getSuggestedMatches(@Param('statementId') statementId: string) {
    return this.service.findSuggestedMatches(statementId);
  }

  @Post('link')
  linkManual(
    @Body()
    data: {
      statementId: string;
      lancamentoId: string;
      confirmacaoManual?: boolean;
    },
    @Req() req: any,
  ) {
    return this.service.linkManual(
      data.statementId,
      data.lancamentoId,
      data.confirmacaoManual,
      req.user?.id,
    );
  }

  @Post('create-and-link')
  createAndLink(
    @Body()
    data: {
      statementId: string;
      lancamentoId?: string;
      confirmacaoManual?: boolean;
      [key: string]: any;
    },
    @Req() req: any,
  ) {
    const { statementId, confirmacaoManual, ...rest } = data;
    return this.service.createAndLink(
      statementId,
      rest,
      confirmacaoManual,
      req.user?.id,
    );
  }

  @Delete('unlink/:conciliacaoId')
  unlink(@Param('conciliacaoId') conciliacaoId: string, @Req() req: any) {
    return this.service.unlink(conciliacaoId, req.user?.id);
  }
}
