import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createObraDto: CreateObraDto) {
    return this.prisma.obra.create({
      data: createObraDto,
    });
  }

  async findAll() {
    return this.prisma.obra.findMany({
      include: {
        cliente: true,
        centroCusto: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { id },
      include: {
        cliente: true,
        centroCusto: true,
        lancamentos: true,
      },
    });

    if (!obra) {
      throw new NotFoundException(`Obra with ID ${id} not found`);
    }
    return obra;
  }

  async update(id: string, updateObraDto: UpdateObraDto) {
    await this.findOne(id); // Check existence
    return this.prisma.obra.update({
      where: { id },
      data: updateObraDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check existence
    return this.prisma.obra.delete({
      where: { id },
    });
  }
}
