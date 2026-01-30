import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FinancialBudgetService } from './financial-budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('financial/budget')
@UseGuards(AuthGuard('jwt'))
export class FinancialBudgetController {
    constructor(private readonly service: FinancialBudgetService) { }

    @Post()
    upsert(@Body() createBudgetDto: CreateBudgetDto) {
        return this.service.upsert(createBudgetDto);
    }

    @Get()
    findAll(@Query('ano') ano: string) {
        return this.service.findAll(ano ? parseInt(ano) : undefined);
    }
}
