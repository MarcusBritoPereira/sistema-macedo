import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateClientDto } from './dto/create-client.dto';
import * as Papa from 'papaparse';
import { Response } from 'express';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ClienteCreateInput) {
    if (data.cpf) {
      const existingCpf = await this.prisma.cliente.findUnique({
        where: { cpf: data.cpf },
      });
      if (existingCpf) {
        if (!existingCpf.ativo) {
          // Reativa e atualiza o cliente deletado logicamente (soft-delete)
          return this.prisma.cliente.update({
            where: { id: existingCpf.id },
            data: {
              ...data,
              ativo: true,
            },
          });
        }
        throw new ConflictException('Já existe um cliente cadastrado com este CPF.');
      }
    }

    if (data.cnpj) {
      const existingCnpj = await this.prisma.cliente.findUnique({
        where: { cnpj: data.cnpj },
      });
      if (existingCnpj) {
        if (!existingCnpj.ativo) {
          // Reativa e atualiza o cliente deletado logicamente (soft-delete)
          return this.prisma.cliente.update({
            where: { id: existingCnpj.id },
            data: {
              ...data,
              ativo: true,
            },
          });
        }
        throw new ConflictException('Já existe um cliente cadastrado com este CNPJ.');
      }
    }

    return this.prisma.cliente.create({ data });
  }

  getTemplate(res: Response) {
    const csv = Papa.unparse([{
      'Razão Social': 'Empresa Exemplo LTDA',
      'Nome Fantasia': 'Exemplo',
      'CNPJ': '00.000.000/0000-00',
      'CPF': '',
      'Email': 'contato@exemplo.com',
      'Telefone': '11999999999',
      'Endereço': 'Rua Exemplo, 123',
      'Representante Nome': 'João da Silva',
      'Representante CPF': '000.000.000-00',
      'Financeiro Nome': 'Maria Souza',
      'Financeiro Email': 'financeiro@exemplo.com'
    }]);
    res.header('Content-Type', 'text/csv');
    res.attachment('clientes_modelo.csv');
    return res.send(csv);
  }

  async importCsv(file: Express.Multer.File) {
    const csvData = file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    const validData: any[] = [];
    
    const normalizeKey = (key: string): string => {
      return key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    };

    const keyMap: Record<string, string> = {
      razaosocial: 'razaoSocial',
      nomefantasia: 'nomeFantasia',
      cnpj: 'cnpj',
      cpf: 'cpf',
      email: 'email',
      telefone: 'telefone',
      endereco: 'endereco',
      enderecoprincipal: 'endereco',
      representantenome: 'representanteNome',
      nomerepresentante: 'representanteNome',
      representantecpf: 'representanteCpf',
      cpfrepresentante: 'representanteCpf',
      financeironome: 'financeiroNome',
      nomefinanceiro: 'financeiroNome',
      financeiroemail: 'financeiroEmail',
      emailfinanceiro: 'financeiroEmail',
    };
    
    for (const rawRow of data as any[]) {
      const row: any = {};
      for (const rawKey of Object.keys(rawRow)) {
        const normalized = normalizeKey(rawKey);
        const mappedKey = keyMap[normalized];
        if (mappedKey) {
          row[mappedKey] = rawRow[rawKey];
        } else {
          row[rawKey] = rawRow[rawKey];
        }
      }

      let razaoSocial = row.razaoSocial?.toString().trim();
      let nomeFantasia = row.nomeFantasia?.toString().trim();
      
      if (!razaoSocial && nomeFantasia) {
        razaoSocial = nomeFantasia;
      }
      if (!nomeFantasia && razaoSocial) {
        nomeFantasia = razaoSocial;
      }

      if (!razaoSocial) continue;

      validData.push({
        razaoSocial: razaoSocial,
        nomeFantasia: nomeFantasia || null,
        cnpj: row.cnpj?.toString().trim() || null,
        cpf: row.cpf?.toString().trim() || null,
        email: row.email?.toString().trim() || null,
        telefone: row.telefone?.toString().trim() || null,
        endereco: row.endereco?.toString().trim() || null,
        representanteNome: row.representanteNome?.toString().trim() || null,
        representanteCpf: row.representanteCpf?.toString().trim() || null,
        financeiroNome: row.financeiroNome?.toString().trim() || null,
        financeiroEmail: row.financeiroEmail?.toString().trim() || null,
      });
    }

    if (validData.length > 0) {
      const result = await this.createMany(validData);
      return {
        success: true,
        imported: result.created,
        total: result.total,
        created: result.created,
        skipped: result.skipped,
      };
    }
    
    return { success: true, imported: 0, total: 0, created: 0, skipped: 0 };
  }

  async createMany(data: CreateClientDto[]) {
    const result = await this.prisma.cliente.createMany({
      data,
      skipDuplicates: true,
    });

    return {
      total: data.length,
      created: result.count,
      skipped: data.length - result.count,
    };
  }

  findAll(includeInactive = false) {
    return this.prisma.cliente.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: { razaoSocial: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.cliente.findUnique({
      where: { id },
      include: { contatos: true, contratos: true },
    });
  }

  async update(id: string, data: Prisma.ClienteUpdateInput) {
    if (data.cpf && typeof data.cpf === 'string') {
      const existingCpf = await this.prisma.cliente.findFirst({
        where: { cpf: data.cpf, NOT: { id } },
      });
      if (existingCpf) {
        throw new ConflictException('Já existe um cliente cadastrado com este CPF.');
      }
    }

    if (data.cnpj && typeof data.cnpj === 'string') {
      const existingCnpj = await this.prisma.cliente.findFirst({
        where: { cnpj: data.cnpj, NOT: { id } },
      });
      if (existingCnpj) {
        throw new ConflictException('Já existe um cliente cadastrado com este CNPJ.');
      }
    }

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
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // 1. Active Clients with their earliest contract start date
    const activeClientsList = await this.prisma.cliente.findMany({
      where: { ativo: true },
      select: {
        createdAt: true,
        contratos: {
          select: { dataInicio: true },
          orderBy: { dataInicio: 'asc' },
          take: 1,
        },
      },
    });
    const activeClients = activeClientsList.length;

    // 4. Average Lifetime (Active Clients) - uses contract dataInicio or createdAt as fallback
    let avgLifetimeMonths = 0;
    if (activeClients > 0) {
      const totalDurationMs = activeClientsList.reduce((acc, client) => {
        const startDate =
          client.contratos.length > 0
            ? new Date(client.contratos[0].dataInicio)
            : new Date(client.createdAt);
        return acc + (now.getTime() - startDate.getTime());
      }, 0);
      const avgDurationMs = totalDurationMs / activeClients;
      avgLifetimeMonths = Number(
        (avgDurationMs / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1),
      );
    }

    // 2. Churn (Deactivated this month)
    const churnCount = await this.prisma.cliente.count({
      where: {
        ativo: false,
        updatedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // 3. LTV (Average Lifetime Value)
    const totalRevenueAgg = await this.prisma.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'RECEITA',
        status: { in: ['REALIZADO', 'CONCILIADO'] },
      },
    });
    const totalRevenue = Number(totalRevenueAgg._sum.valor || 0);

    const totalClients = await this.prisma.cliente.count();

    const avgLtv = totalClients > 0 ? totalRevenue / totalClients : 0;

    return {
      activeClients,
      churnCount,
      avgLtv,
      avgLifetimeMonths,
    };
  }

  async getExecutiveData(includeInactive = false) {
    const clients = await this.prisma.cliente.findMany({
      where: includeInactive ? {} : { ativo: true },
      include: {
        contratos: {
          where: { ativo: true },
          orderBy: { dataInicio: 'asc' },
        },
        contatos: {
          where: { principal: true },
        },
      },
    });

    const now = new Date();

    // N+1 Optimization: Fetch all overdue bills for relevant clients in a single query
    const clientIds = clients.map((c) => c.id);
    const allOverdueBills = await this.prisma.lancamentoFinanceiro.groupBy({
      by: ['clienteId'],
      where: {
        clienteId: { in: clientIds },
        tipo: 'RECEITA',
        status: 'PREVISTO',
        dataVencimento: { lt: now },
      },
      _count: {
        id: true,
      },
    });

    // Map id to count for O(1) lookup
    const overdueMap = new Map(
      allOverdueBills.map((b) => [b.clienteId, b._count.id]),
    );

    // Enrich data
    const enrichedClients = clients.map((client) => {
      // 1. Revenue (Sum of active contracts) - "Valor acordado"
      const revenue = client.contratos.reduce((sum, contract) => {
        return sum + Number(contract.valorMensal);
      }, 0);

      // 2. Dates
      const dataInicio =
        client.contratos.length > 0
          ? client.contratos[0].dataInicio
          : client.createdAt;
      // Get latest dataFim
      const sortedByEnd = [...client.contratos].sort((a, b) => {
        if (!a.dataFim) return 1;
        if (!b.dataFim) return -1;
        return new Date(b.dataFim).getTime() - new Date(a.dataFim).getTime();
      });
      const dataTermino =
        sortedByEnd.length > 0 ? sortedByEnd[0].dataFim : null;

      // 3. Remaining Days - "Tempo restante (dias)"
      let tempoRestanteDias: number | null = null;
      if (dataTermino) {
        const diffTime = new Date(dataTermino).getTime() - now.getTime();
        tempoRestanteDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // 4. Lifetime Months - "LT (Meses)"
      const createdAt = new Date(client.createdAt);
      const durationMs = now.getTime() - createdAt.getTime();
      const durationMonths = Number(
        (durationMs / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1),
      );

      // 5. Status & Health (Using optimized map)
      const overdueBillsCount = overdueMap.get(client.id) || 0;

      let healthScore: 'GOOD' | 'ATTENTION' | 'RISK' = 'GOOD';
      if (overdueBillsCount > 0) {
        healthScore = overdueBillsCount > 1 ? 'RISK' : 'ATTENTION';
      }

      // Status string for UI display
      let statusDisplay = 'Ativo';
      if (client.contratos.length === 0) statusDisplay = 'Sem Contrato';
      else if (overdueBillsCount > 0) statusDisplay = 'Inadimplente';
      else if (tempoRestanteDias !== null && tempoRestanteDias < 0)
        statusDisplay = 'Contrato Vencido';

      return {
        ...client,
        revenue,
        dataInicio,
        dataTermino,
        tempoRestanteDias,
        durationMonths,
        healthScore,
        statusDisplay,
        planType:
          client.contratos.length > 0 ? client.contratos[0].tipo : 'N/A',
      };
    });

    // Default sort by Revenue DESC
    return enrichedClients.sort((a, b) => b.revenue - a.revenue);
  }
}
