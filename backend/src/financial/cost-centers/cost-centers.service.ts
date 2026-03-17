import { Injectable } from '@nestjs/common';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  create(createCostCenterDto: CreateCostCenterDto) {
    return this.prisma.centroCusto.create({
      data: createCostCenterDto,
    });
  }

  findAll() {
    return this.prisma.centroCusto.findMany();
  }

  findOne(id: string) {
    return this.prisma.centroCusto.findUnique({
      where: { id },
    });
  }

  update(id: string, updateCostCenterDto: UpdateCostCenterDto) {
    return this.prisma.centroCusto.update({
      where: { id },
      data: updateCostCenterDto,
    });
  }

  remove(id: string) {
    return this.prisma.centroCusto.delete({
      where: { id },
    });
  }
}
