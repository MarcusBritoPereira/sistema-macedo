import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as Papa from 'papaparse';
import { Response } from 'express';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.categoriaFinanceira.create({
      data: createCategoryDto,
    });
  }

  getTemplate(res: Response) {
    const csv = Papa.unparse([{ nome: '', tipo: 'RECEITA ou DESPESA', descricao: '', classificacao: '' }]);
    res.header('Content-Type', 'text/csv');
    res.attachment('categorias_modelo.csv');
    return res.send(csv);
  }

  async importCsv(file: Express.Multer.File) {
    const csvData = file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    let count = 0;
    
    for (const row of data as any[]) {
      if (!row.nome || !row.tipo) continue;
      
      const tipo = row.tipo.trim().toUpperCase();
      if (tipo !== 'RECEITA' && tipo !== 'DESPESA') continue;

      const existing = await this.prisma.categoriaFinanceira.findFirst({
        where: { nome: row.nome.trim(), tipo: tipo as any }
      });

      if (!existing) {
        await this.prisma.categoriaFinanceira.create({
          data: {
            nome: row.nome.trim(),
            tipo: tipo as any,
            descricao: row.descricao || null,
            classificacao: row.classificacao || null,
          }
        });
        count++;
      }
    }
    return { success: true, imported: count };
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
