
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
        // Ideally soft delete using 'ativo' or similar if schema supports it,
        // otherwise hard delete or just set status to INACTIVE.
        // Let's assume hard delete for now or update inactive if field exists.
        // Schema has 'ativo' Boolean @default(true)
        return this.prisma.contrato.update({
            where: { id },
            data: { ativo: false }
        });
    }
}
