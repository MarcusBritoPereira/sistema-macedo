import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as Papa from 'papaparse';
import { Response } from 'express';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private sanitizeCategoryPayload(
    dto: CreateCategoryDto | UpdateCategoryDto,
  ): CreateCategoryDto | UpdateCategoryDto {
    const data: any = {};
    if (dto.nome !== undefined) data.nome = dto.nome.trim();
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.descricao !== undefined) {
      data.descricao = dto.descricao?.trim() || null;
    }
    if (dto.classificacao !== undefined) {
      data.classificacao = dto.classificacao || null;
    }
    if (dto.parentId !== undefined) data.parentId = dto.parentId || null;
    return data;
  }

  private async ensureUniqueName(
    data: CreateCategoryDto | UpdateCategoryDto,
    currentId?: string,
  ) {
    if (!data.nome) return;

    const parentId = data.parentId || null;
    const existing = await this.prisma.categoriaFinanceira.findFirst({
      where: {
        nome: { equals: data.nome, mode: 'insensitive' },
        tipo: data.tipo,
        parentId,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe uma categoria com este nome para o mesmo tipo.',
      );
    }
  }

  private mapCategory(category: any) {
    if (!category) return category;
    const children = category.children || [];
    return {
      ...category,
      subcategorias: children,
      children,
    };
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const data = this.sanitizeCategoryPayload(
      createCategoryDto,
    ) as CreateCategoryDto;
    if (!data.nome) {
      throw new BadRequestException('Nome da categoria é obrigatório.');
    }
    await this.ensureUniqueName(data);

    const category = await this.prisma.categoriaFinanceira.create({
      data,
      include: { children: true, parent: true },
    });
    return this.mapCategory(category);
  }

  getTemplate(res: Response) {
    const csv = Papa.unparse([
      {
        nome: '',
        tipo: 'RECEITA ou DESPESA',
        descricao: '',
        classificacao: '',
      },
    ]);
    res.header('Content-Type', 'text/csv');
    res.attachment('categorias_modelo.csv');
    return res.send(csv);
  }

  async importCsv(file: Express.Multer.File) {
    const csvData = file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });
    let count = 0;

    for (const row of data as any[]) {
      if (!row.nome || !row.tipo) continue;

      const tipo = row.tipo.trim().toUpperCase();
      if (tipo !== 'RECEITA' && tipo !== 'DESPESA') continue;

      const existing = await this.prisma.categoriaFinanceira.findFirst({
        where: {
          nome: { equals: row.nome.trim(), mode: 'insensitive' },
          tipo: tipo as any,
          parentId: null,
        },
      });

      if (!existing) {
        await this.prisma.categoriaFinanceira.create({
          data: {
            nome: row.nome.trim(),
            tipo: tipo as any,
            descricao: row.descricao || null,
            classificacao: row.classificacao || null,
          },
        });
        count++;
      }
    }
    return { success: true, imported: count };
  }

  async findAll() {
    const categories = await this.prisma.categoriaFinanceira.findMany({
      include: { children: { orderBy: { nome: 'asc' } }, parent: true },
      orderBy: { nome: 'asc' },
    });
    return categories.map((category) => this.mapCategory(category));
  }

  // Get only root categories with children tree
  async findAllTree() {
    const categories = await this.prisma.categoriaFinanceira.findMany({
      where: { parentId: null },
      include: {
        children: { include: { children: true }, orderBy: { nome: 'asc' } },
      },
      orderBy: { nome: 'asc' },
    });
    return categories.map((category) => this.mapCategory(category));
  }

  async findOne(id: string) {
    const category = await this.prisma.categoriaFinanceira.findUnique({
      where: { id },
      include: { children: { orderBy: { nome: 'asc' } }, parent: true },
    });
    return this.mapCategory(category);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const current = await this.prisma.categoriaFinanceira.findUnique({
      where: { id },
      select: { nome: true, tipo: true, parentId: true },
    });
    if (!current) throw new BadRequestException('Categoria não encontrada.');

    const data = this.sanitizeCategoryPayload(updateCategoryDto);
    await this.ensureUniqueName(
      {
        ...data,
        nome: data.nome || current.nome,
        tipo: data.tipo || current.tipo,
        parentId:
          data.parentId === undefined
            ? current.parentId || undefined
            : data.parentId,
      },
      id,
    );

    const category = await this.prisma.categoriaFinanceira.update({
      where: { id },
      data,
      include: { children: { orderBy: { nome: 'asc' } }, parent: true },
    });
    return this.mapCategory(category);
  }

  remove(id: string) {
    return this.prisma.categoriaFinanceira.delete({
      where: { id },
    });
  }
}
