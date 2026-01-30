import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ParametroFiscalService } from './parametro-fiscal.service';
import { CreateFiscalParamDto } from './dto/create-param.dto';
import { UpdateFiscalParamDto } from './dto/update-param.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('fiscal/parameters')
@UseGuards(AuthGuard('jwt'))
export class ParametroFiscalController {
    constructor(private readonly service: ParametroFiscalService) { }

    @Post()
    create(@Body() createDto: CreateFiscalParamDto) {
        return this.service.create(createDto);
    }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateFiscalParamDto) {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
