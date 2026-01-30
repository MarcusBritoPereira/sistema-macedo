import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class FinancialBudgetService {
    constructor(private prisma: PrismaService) { }

    async upsert(createBudgetDto: CreateBudgetDto) {
        const { mes, ano, receitaMeta, despesaMeta } = createBudgetDto;

        // Check if exists
        const existing = await this.prisma.financialBudget.findUnique({
            where: {
                mes_ano: {
                    mes,
                    ano
                }
            }
        });

        if (existing) {
            return this.prisma.financialBudget.update({
                where: { id: existing.id },
                data: { receitaMeta, despesaMeta }
            });
        }

        return this.prisma.financialBudget.create({
            data: {
                mes,
                ano,
                receitaMeta,
                despesaMeta
            }
        });
    }

    findAll(ano?: number) {
        return this.prisma.financialBudget.findMany({
            where: ano ? { ano } : undefined,
            orderBy: { mes: 'asc' }
        });
    }
}
