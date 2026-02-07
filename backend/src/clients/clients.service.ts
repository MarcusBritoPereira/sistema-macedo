
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.ClienteCreateInput) {
        return this.prisma.cliente.create({ data });
    }

    createMany(data: Prisma.ClienteCreateInput[]) {
        // Use transaction to ensure all or nothing, or use createMany if database supports it (Postgres does)
        // prisma.cliente.createMany is efficient
        return this.prisma.cliente.createMany({
            data,
            skipDuplicates: true // Optional: skip if already exists (by unique field like email/cnpj if defined)
        });
    }

    findAll() {
        return this.prisma.cliente.findMany({
            orderBy: { razaoSocial: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.cliente.findUnique({
            where: { id },
            include: { contatos: true, contratos: true },
        });
    }

    update(id: string, data: Prisma.ClienteUpdateInput) {
        return this.prisma.cliente.update({
            where: { id },
            data,
        });
    }

    remove(id: string) {
        return this.prisma.cliente.update({
            where: { id },
            data: { ativo: false }, // Soft delete logic
        });
    }

    async getKpis() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // 1. Active Clients
        const activeClientsList = await this.prisma.cliente.findMany({
            where: { ativo: true },
            select: { createdAt: true }
        });
        const activeClients = activeClientsList.length;

        // 4. Average Lifetime (Active Clients)
        let avgLifetimeMonths = 0;
        if (activeClients > 0) {
            const totalDurationMs = activeClientsList.reduce((acc, client) => {
                return acc + (now.getTime() - new Date(client.createdAt).getTime());
            }, 0);
            const avgDurationMs = totalDurationMs / activeClients;
            avgLifetimeMonths = avgDurationMs / (1000 * 60 * 60 * 24 * 30.44);
        }

        // 2. Churn (Deactivated this month)
        const churnCount = await this.prisma.cliente.count({
            where: {
                ativo: false,
                updatedAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        // 3. LTV (Average Lifetime Value)
        const totalRevenueAgg = await this.prisma.lancamentoFinanceiro.aggregate({
            _sum: { valor: true },
            where: {
                tipo: 'RECEITA',
                status: { in: ['REALIZADO', 'CONCILIADO'] }
            }
        });
        const totalRevenue = Number(totalRevenueAgg._sum.valor || 0);

        const totalClients = await this.prisma.cliente.count();

        const avgLtv = totalClients > 0 ? (totalRevenue / totalClients) : 0;

        return {
            activeClients,
            churnCount,
            avgLtv,
            avgLifetimeMonths
        };
    }

    async getExecutiveData() {
        const clients = await this.prisma.cliente.findMany({
            where: { ativo: true },
            include: {
                contratos: {
                    where: { ativo: true }
                },
                contatos: {
                    where: { principal: true }
                }
            }
        });

        // Enrich data
        const enrichedClients = await Promise.all(clients.map(async (client) => {
            // 1. Revenue (Sum of active contracts)
            const revenue = client.contratos.reduce((sum, contract) => {
                return sum + Number(contract.valorMensal);
            }, 0);

            // 2. Duration (Months)
            const now = new Date();
            const createdAt = new Date(client.createdAt);
            const durationMs = now.getTime() - createdAt.getTime();
            const durationMonths = Math.floor(durationMs / (1000 * 60 * 60 * 24 * 30.44));

            // 3. Health Score
            // Check for overdue payments (PREVISTO items with vencimento < now)
            const overdueBills = await this.prisma.lancamentoFinanceiro.count({
                where: {
                    clienteId: client.id,
                    tipo: 'RECEITA',
                    status: 'PREVISTO',
                    dataVencimento: { lt: now }
                }
            });

            // Also check items near due date if needed, but for "Health Score" usually overdue is critical.

            let healthScore: 'GOOD' | 'ATTENTION' | 'RISK' = 'GOOD';
            if (overdueBills > 0) {
                if (overdueBills > 1) {
                    healthScore = 'RISK';
                } else {
                    healthScore = 'ATTENTION';
                }
            }

            return {
                ...client,
                revenue,
                durationMonths,
                healthScore,
                planType: client.contratos.length > 0 ? client.contratos[0].tipo : 'N/A'
            };
        }));

        // Default sort by Revenue DESC
        return enrichedClients.sort((a, b) => b.revenue - a.revenue);
    }
}
