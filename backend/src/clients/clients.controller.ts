
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    create(@Body() createClientDto: Prisma.ClienteCreateInput) {
        return this.clientsService.create(createClientDto);
    }

    @Get()
    findAll() {
        return this.clientsService.findAll();
    }

    @Get('kpis')
    getKpis() {
        return this.clientsService.getKpis();
    }

    @Get('executive')
    getExecutiveData() {
        return this.clientsService.getExecutiveData();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.clientsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateClientDto: Prisma.ClienteUpdateInput) {
        return this.clientsService.update(id, updateClientDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.clientsService.remove(id);
    }
}
