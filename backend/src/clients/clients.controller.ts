
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    create(@Body() createClientDto: CreateClientDto) {
        return this.clientsService.create(createClientDto);
    }

    @Post('bulk')
    createMany(@Body() createClientsDto: CreateClientDto[]) {
        return this.clientsService.createMany(createClientsDto);
    }

    @Get()
    findAll(@Query('includeInactive') includeInactive?: string) {
        return this.clientsService.findAll(includeInactive === 'true');
    }

    @Get('kpis')
    getKpis() {
        return this.clientsService.getKpis();
    }

    @Get('executive')
    getExecutiveData(@Query('includeInactive') includeInactive?: string) {
        return this.clientsService.getExecutiveData(includeInactive === 'true');
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.clientsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
        return this.clientsService.update(id, updateClientDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.clientsService.remove(id);
    }
}
