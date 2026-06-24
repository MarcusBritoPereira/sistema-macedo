import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';

@Controller('financial/recurring')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('financeiro.recorrencias.read')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @RequirePermissions('financeiro.recorrencias.write')
  create(@Body() body: any) {
    return this.recurringService.create(body);
  }

  @Get()
  findAll() {
    return this.recurringService.findAll();
  }

  @Delete(':id')
  @RequirePermissions('financeiro.recorrencias.delete')
  remove(@Param('id') id: string) {
    return this.recurringService.remove(id);
  }

  @Post('process')
  @RequirePermissions('financeiro.recorrencias.write')
  triggerProcess() {
    return this.recurringService.handleCron();
  }
}
