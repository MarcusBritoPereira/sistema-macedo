import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateSupplierDto) {
        return this.prisma.fornecedor.create({
            data: {
                nomeFantasia: dto.nomeFantasia,
                razaoSocial: dto.razaoSocial,
                cnpj: dto.cnpj,
                email: dto.email,
                telefone: dto.telefone,
                categoriaDefaultId: dto.categoriaDefaultId,
                ativo: dto.ativo ?? true
            }
        });
    }

    async findAll() {
        return this.prisma.fornecedor.findMany({
            orderBy: { nomeFantasia: 'asc' }
        });
    }

    async findOne(id: string) {
        const supplier = await this.prisma.fornecedor.findUnique({
            where: { id }
        });
        if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
        return supplier;
    }

    async update(id: string, dto: UpdateSupplierDto) {
        await this.findOne(id); // Check existence
        return this.prisma.fornecedor.update({
            where: { id },
            data: dto
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
            throw new Error('Não é possível excluir fornecedor com lançamentos vinculados.');
        }
    }
}
