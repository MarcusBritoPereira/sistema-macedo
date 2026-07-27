import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import * as Papa from 'papaparse';
import { Response } from 'express';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    const cnpj = dto.cnpj?.replace(/\D/g, '').trim() || null;

    try {
      return await this.prisma.fornecedor.create({
        data: {
          nomeFantasia: dto.nomeFantasia,
          razaoSocial: dto.razaoSocial,
          cnpj,
          email: dto.email || null,
          telefone: dto.telefone || null,
          categoriaDefaultId: dto.categoriaDefaultId || null,
          ativo: dto.ativo ?? true,
        },
      });
    } catch (error: any) {
      if (
        error?.code === 'P2002' &&
        Array.isArray(error?.meta?.target) &&
        error.meta.target.includes('cnpj')
      ) {
        throw new ConflictException(
          'Já existe um fornecedor cadastrado com este CPF/CNPJ.',
        );
      }

      throw error;
    }
  }

  getTemplate(res: Response) {
    const csv = Papa.unparse([{
      'Fornecedor': 'Exemplo Fornecedor',
      'Razão Social': 'Fornecedor Exemplo LTDA',
      'CNPJ': '00.000.000/0000-00',
      'Email': 'contato@exemplo.com',
      'Telefone': '11999999999'
    }]);
    res.header('Content-Type', 'text/csv');
    res.attachment('fornecedores_modelo.csv');
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
      fornecedor: 'nomeFantasia',
      nomefantasia: 'nomeFantasia',
      razaosocial: 'razaoSocial',
      cnpj: 'cnpj',
      email: 'email',
      telefone: 'telefone',
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

      let nomeFantasia = row.nomeFantasia?.toString().trim();
      let razaoSocial = row.razaoSocial?.toString().trim();
      
      if (!nomeFantasia && razaoSocial) {
        nomeFantasia = razaoSocial;
      }
      if (!razaoSocial && nomeFantasia) {
        razaoSocial = nomeFantasia;
      }

      if (!nomeFantasia) continue;
      
      validData.push({
        nomeFantasia: nomeFantasia,
        razaoSocial: razaoSocial || null,
        cnpj: row.cnpj?.toString().trim() || null,
        email: row.email?.toString().trim() || null,
        telefone: row.telefone?.toString().trim() || null,
        ativo: true,
      });
    }

    if (validData.length > 0) {
      const result = await this.prisma.fornecedor.createMany({
        data: validData,
        skipDuplicates: true,
      });
      return { success: true, imported: result.count };
    }
    
    return { success: true, imported: 0 };
  }

  async findAll() {
    return this.prisma.fornecedor.findMany({
      orderBy: { nomeFantasia: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.fornecedor.findUnique({
      where: { id },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id); // Check existence
    return this.prisma.fornecedor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check existence
    // Optional: Check dependencies (e.g. lancamentos) before deleting
    // For now, we allow delete or better, soft delete via 'ativo' flag?
    // User requested DELETE, so typically physical delete or status update.
    // Let's implement physical delete for now but warn about constraints if they happen.
    try {
      return await this.prisma.fornecedor.delete({ where: { id } });
    } catch (e) {
      // Fallback to disabling if foreign key fails (thought about soft delete first but schema has no relations preventing it yet unless Lancamento matches)
      throw new Error(
        'Não é possível excluir fornecedor com lançamentos vinculados.',
      );
    }
  }
}
