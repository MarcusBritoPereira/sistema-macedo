import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import * as Papa from 'papaparse';
import { Response } from 'express';

@Injectable()
export class FinancialBudgetService {
  constructor(private prisma: PrismaService) {}

  async upsert(createBudgetDto: CreateBudgetDto) {
    const { mes, ano, receitaMeta, despesaMeta } = createBudgetDto;

    // Check if exists
    const existing = await this.prisma.financialBudget.findUnique({
      where: {
        mes_ano: {
          mes,
          ano,
        },
      },
    });

    if (existing) {
      return this.prisma.financialBudget.update({
        where: { id: existing.id },
        data: { receitaMeta, despesaMeta },
      });
    }

    return this.prisma.financialBudget.create({
      data: {
        mes,
        ano,
        receitaMeta,
        despesaMeta,
      },
    });
  }

  getTemplate(res: Response) {
    const csv = Papa.unparse([{ mes: '1', ano: '2026', receitaMeta: '1000.00', despesaMeta: '500.00' }]);
    res.header('Content-Type', 'text/csv');
    res.attachment('orcamentos_modelo.csv');
    return res.send(csv);
  }

  async importCsv(file: Express.Multer.File) {
    const csvData = file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    let count = 0;
    
    for (const row of data as any[]) {
      if (!row.mes || !row.ano || !row.receitaMeta || !row.despesaMeta) continue;

      const mes = parseInt(row.mes);
      const ano = parseInt(row.ano);
      if (isNaN(mes) || isNaN(ano)) continue;

      await this.upsert({
        mes,
        ano,
        receitaMeta: parseFloat(row.receitaMeta) || 0,
        despesaMeta: parseFloat(row.despesaMeta) || 0,
      });
      count++;
    }
    return { success: true, imported: count };
  }

  findAll(ano?: number) {
    return this.prisma.financialBudget.findMany({
      where: ano ? { ano } : undefined,
      orderBy: { mes: 'asc' },
    });
  }
}
