import { Injectable } from '@nestjs/common';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as Papa from 'papaparse';
import { Response } from 'express';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeData(dto: any) {
    const data = { ...dto };
    const nullableStrings = [
      'parentId',
      'obraId',
      'responsavelId',
      'planoContaId',
      'etapaId',
      'tipo',
      'categoriaFinanceira',
      'categoriaCompra',
      'cor',
      'tags',
      'descricao',
      'codigo',
      'contaContabil',
      'unidadeMedida'
    ];
    
    nullableStrings.forEach(field => {
      if (data[field] === '' || data[field] === 'null' || data[field] === undefined) {
        data[field] = null;
      }
    });

    return data;
  }

  create(createCostCenterDto: CreateCostCenterDto) {
    const sanitized = this.sanitizeData(createCostCenterDto);
    return this.prisma.centroCusto.create({
      data: sanitized,
    });
  }

  getTemplate(res: Response) {
    const csv = Papa.unparse([{ nome: 'Administrativo', codigo: 'ADM-01', descricao: 'Despesas Administrativas' }]);
    res.header('Content-Type', 'text/csv');
    res.attachment('centros_custo_modelo.csv');
    return res.send(csv);
  }

  async importCsv(file: Express.Multer.File) {
    const csvData = file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    const validData: any[] = [];
    
    for (const row of data as any[]) {
      if (!row.nome) continue;
      
      validData.push({
        nome: row.nome.trim(),
        codigo: row.codigo?.trim() || null,
        descricao: row.descricao?.trim() || null,
      });
    }

    if (validData.length > 0) {
      const result = await this.prisma.centroCusto.createMany({
        data: validData,
        skipDuplicates: true,
      });
      return { success: true, imported: result.count };
    }
    
    return { success: true, imported: 0 };
  }

  findAll() {
    return this.prisma.centroCusto.findMany({
      include: {
        parent: true,
        obra: true,
        responsavel: true,
        planoConta: true,
      },
      orderBy: [
        { codigo: 'asc' },
        { nome: 'asc' }
      ]
    });
  }

  findOne(id: string) {
    return this.prisma.centroCusto.findUnique({
      where: { id },
      include: {
        parent: true,
        obra: true,
        responsavel: true,
        planoConta: true,
      },
    });
  }

  update(id: string, updateCostCenterDto: UpdateCostCenterDto) {
    const sanitized = this.sanitizeData(updateCostCenterDto);
    return this.prisma.centroCusto.update({
      where: { id },
      data: sanitized,
    });
  }

  remove(id: string) {
    return this.prisma.centroCusto.delete({
      where: { id },
    });
  }
}

