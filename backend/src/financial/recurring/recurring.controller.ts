import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('financial/recurring')
@UseGuards(AuthGuard('jwt'))
export class RecurringController {
    constructor(private readonly recurringService: RecurringService) { }

    @Post()
    create(@Body() body: any) {
        return this.recurringService.create(body);
    }

    @Get()
    findAll() {
        return this.recurringService.findAll();
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.recurringService.remove(id);
    }

    @Post('process')
    triggerProcess() {
        return this.recurringService.handleCron();
    }
}
