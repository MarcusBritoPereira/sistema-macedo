import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async createLog(data: {
    acao: string;
    tabela?: string;
    registroId?: string;
    valorAntigo?: string;
    valorNovo?: string;
    motivo: string;
    usuarioId: string;
  }) {
    return this.prisma.logAuditoria.create({
      data: {
        ...data,
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.LogAuditoriaWhereUniqueInput;
    where?: Prisma.LogAuditoriaWhereInput;
    orderBy?: Prisma.LogAuditoriaOrderByWithRelationInput;
  }) {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.logAuditoria.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy: orderBy || { data: 'desc' },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  async count(where: Prisma.LogAuditoriaWhereInput) {
    return this.prisma.logAuditoria.count({ where });
  }
}
