import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFiscalParamDto } from './dto/create-param.dto';
import { UpdateFiscalParamDto } from './dto/update-param.dto';

@Injectable()
export class ParametroFiscalService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateFiscalParamDto) {
    return this.prisma.parametroFiscal.create({
      data: createDto,
    });
  }

  findAll() {
    return this.prisma.parametroFiscal.findMany();
  }

  findOne(id: string) {
    return this.prisma.parametroFiscal.findUnique({
      where: { id },
    });
  }

  findByNome(nome: string) {
    return this.prisma.parametroFiscal.findUnique({
      where: { nome },
    });
  }

  update(id: string, updateDto: UpdateFiscalParamDto) {
    return this.prisma.parametroFiscal.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.parametroFiscal.delete({
      where: { id },
    });
  }
}
