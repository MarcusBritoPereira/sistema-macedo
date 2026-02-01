
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('contracts')
@UseGuards(AuthGuard('jwt'))
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) { }

    @Post()
    create(@Body() createContractDto: Prisma.ContratoCreateInput) {
        return this.contractsService.create(createContractDto);
    }

    @Get()
    findAll() {
        return this.contractsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.contractsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateContractDto: Prisma.ContratoUpdateInput) {
        console.log('Update Contract:', id, updateContractDto);
        return this.contractsService.update(id, updateContractDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.contractsService.remove(id);
    }

    @Post(':id/generate')
    generate(@Param('id') id: string) {
        return this.contractsService.generateFinancial(id);
    }
}
