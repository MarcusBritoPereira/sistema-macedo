
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContractsService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.ContratoCreateInput) {
        return this.prisma.contrato.create({ data });
    }

    findAll() {
        return this.prisma.contrato.findMany({
            where: {
                ativo: true
            },
            include: { cliente: true }, // Include client details
            orderBy: { createdAt: 'desc' }
        });
    }

    findOne(id: string) {
        return this.prisma.contrato.findUnique({
            where: { id },
            include: { cliente: true }
        });
    }

    update(id: string, data: Prisma.ContratoUpdateInput) {
        return this.prisma.contrato.update({
            where: { id },
            data
        });
    }

    remove(id: string) {
        return this.prisma.contrato.update({
            where: { id },
            data: { ativo: false }
        });
    }

    async generateFinancial(id: string) {
        const contract = await this.prisma.contrato.findUnique({
            where: { id },
            include: { cliente: true }
        });

        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        const diaVencimento = contract.diaVencimento || 10;
        const valor = contract.valorMensal;

        let startDate = new Date(contract.dataInicio);
        let endDate = contract.dataFim ? new Date(contract.dataFim) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // Default 1 year if infinite

        let count = 0;
        let currentDate = new Date(startDate);

        // Adjust start date to next valid month if needed, but usually we verify existing.
        // For simplicity, we loop from start to end.

        while (currentDate <= endDate) {
            // Calculate Vencimento for this month
            // If the start date day is > diaVencimento, maybe skip first month? 
            // Or just respect the month of currentDate.

            const month = currentDate.getMonth();
            const year = currentDate.getFullYear();

            // Set Vencimento Date
            const vencimentoDate = new Date(year, month, diaVencimento);

            // Competence Date (1st of the month)
            const competenciaDate = new Date(year, month, 1);

            // Check if already exists (simple check by contractId and month/year approximation)
            // Or just check if there is a lancamento for this contract with this competence
            const exists = await this.prisma.lancamentoFinanceiro.findFirst({
                where: {
                    contratoId: id,
                    dataCompetencia: competenciaDate
                }
            });

            if (!exists) {
                await this.prisma.lancamentoFinanceiro.create({
                    data: {
                        descricao: `${contract.descricao} - ${month + 1}/${year}`,
                        valor: valor,
                        dataVencimento: vencimentoDate,
                        dataCompetencia: competenciaDate,
                        tipo: 'RECEITA',
                        status: 'PREVISTO',
                        contratoId: id,
                        clienteId: contract.clienteId,
                        categoriaId: null, // User can assign later or we config default
                        // centroCustoId defaults?
                    }
                });
                count++;
            }

            // Next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return { message: 'Lançamentos gerados', count };
    }
}
