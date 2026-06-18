import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';
import * as Papa from 'papaparse';
import { Response } from 'express';

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createObraDto: CreateObraDto) {
    return this.prisma.obra.create({
      data: createObraDto,
    });
  }

  getTemplate(res: Response) {
    const csv = Papa.unparse([{ nome: 'Edifício Central', descricao: 'Construção do Edifício Central', dataInicio: '2026-01-01', orcamentoPrevisto: '500000.00', endereco: 'Rua Principal, 100' }]);
    res.header('Content-Type', 'text/csv');
    res.attachment('obras_modelo.csv');
    return res.send(csv);
  }

  async importCsv(file: Express.Multer.File) {
    const csvData = file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    const validData: any[] = [];
    
    for (const row of data as any[]) {
      if (!row.nome) continue;
      
      let dataInicio: Date | null = null;
      if (row.dataInicio) {
        const parsed = new Date(row.dataInicio);
        if (!isNaN(parsed.getTime())) dataInicio = parsed;
      }

      validData.push({
        nome: row.nome.trim(),
        descricao: row.descricao?.trim() || null,
        dataInicio,
        orcamentoPrevisto: row.orcamentoPrevisto ? parseFloat(row.orcamentoPrevisto) : null,
        endereco: row.endereco?.trim() || null,
        status: 'PLANEJAMENTO',
        ativo: true,
      });
    }

    if (validData.length > 0) {
      const result = await this.prisma.obra.createMany({
        data: validData,
        skipDuplicates: true,
      });
      return { success: true, imported: result.count };
    }
    
    return { success: true, imported: 0 };
  }

  async findAll() {
    return this.prisma.obra.findMany({
      include: {
        cliente: true,
        centroCusto: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { id },
      include: {
        cliente: true,
        centroCusto: true,
        lancamentos: true,
        parcelas: {
          orderBy: { dataVencimento: 'asc' }
        },
      },
    });

    if (!obra) {
      throw new NotFoundException(`Obra with ID ${id} not found`);
    }
    return obra;
  }

  async update(id: string, updateObraDto: UpdateObraDto) {
    await this.findOne(id); // Check existence
    return this.prisma.obra.update({
      where: { id },
      data: updateObraDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check existence
    return this.prisma.obra.delete({
      where: { id },
    });
  }

  async createParcela(obraId: string, data: any) {
    return this.prisma.parcelaObra.create({
      data: {
        obraId,
        porcentagem: data.porcentagem,
        valor: data.valor,
        dataVencimento: new Date(data.dataVencimento),
        status: data.status || 'PREVISTO',
      },
    });
  }

  async findParcelas(obraId: string) {
    return this.prisma.parcelaObra.findMany({
      where: { obraId },
      orderBy: { dataVencimento: 'asc' },
    });
  }

  async updateParcela(parcelaId: string, data: any) {
    const existing = await this.prisma.parcelaObra.findUnique({
      where: { id: parcelaId },
      include: { obra: true },
    });

    if (!existing) throw new NotFoundException('Parcela não encontrada');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.parcelaObra.update({
        where: { id: parcelaId },
        data: {
          porcentagem: data.porcentagem ?? existing.porcentagem,
          valor: data.valor ?? existing.valor,
          dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : existing.dataVencimento,
          status: data.status ?? existing.status,
        },
        include: { obra: true }
      });

      if (
        data.status === 'RECEBIDO' && 
        existing.status !== 'RECEBIDO' && 
        !existing.transacaoId
      ) {
        const transacao = await tx.lancamentoFinanceiro.create({
          data: {
            descricao: `Recebimento Parcela Obra: ${updated.obra.nome} (${updated.porcentagem}%)`,
            valor: updated.valor,
            dataVencimento: updated.dataVencimento,
            dataPagamento: new Date(),
            dataCompetencia: new Date(),
            tipo: 'RECEITA',
            status: 'REALIZADO',
            obraId: updated.obraId,
            clienteId: updated.obra?.clienteId,
            tipoLancamento: 'OBRA',
          }
        });

        await tx.parcelaObra.update({
          where: { id: updated.id },
          data: { transacaoId: transacao.id }
        });
      }

      return updated;
    });
  }

  async removeParcela(parcelaId: string) {
    return this.prisma.parcelaObra.delete({
      where: { id: parcelaId },
    });
  }
}
