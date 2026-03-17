import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.categoriaFinanceira.create({
      data: createCategoryDto,
    });
  }

  findAll() {
    return this.prisma.categoriaFinanceira.findMany({
      include: { children: true, parent: true },
      orderBy: { nome: 'asc' },
    });
  }

  // Get only root categories with children tree
  findAllTree() {
    return this.prisma.categoriaFinanceira.findMany({
      where: { parentId: null },
      include: { children: { include: { children: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.categoriaFinanceira.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto) {
    return this.prisma.categoriaFinanceira.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  remove(id: string) {
    return this.prisma.categoriaFinanceira.delete({
      where: { id },
    });
  }
}
