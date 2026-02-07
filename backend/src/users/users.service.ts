
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        const hashedPassword = await bcrypt.hash(data.senha, 10);

        // Handle profile connection by name if provided as string
        let perfilConnection = {};
        if (typeof data.perfil === 'string') {
            perfilConnection = {
                perfil: {
                    connect: { nome: data.perfil }
                }
            };
            delete data.perfil; // Remove raw string to avoid schema conflict
        }

        return this.prisma.usuario.create({
            data: {
                ...data,
                senha: hashedPassword,
                ...perfilConnection
            },
        });
    }

    findAll() {
        return this.prisma.usuario.findMany({
            select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true }, // Exclude password
        });
    }

    findOne(id: string) {
        return this.prisma.usuario.findUnique({
            where: { id },
            include: { perfil: true },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.usuario.findUnique({
            where: { email },
            include: { perfil: true }
        });
    }

    async update(id: string, data: any) {
        if (data.senha && typeof data.senha === 'string') {
            data.senha = await bcrypt.hash(data.senha, 10);
        }

        // Handle profile connection by name if provided as string
        let perfilConnection = {};
        if (typeof data.perfil === 'string') {
            perfilConnection = {
                perfil: {
                    connect: { nome: data.perfil }
                }
            };
            delete data.perfil;
        }

        return this.prisma.usuario.update({
            where: { id },
            data: {
                ...data,
                ...perfilConnection
            },
        });
    }

    remove(id: string) {
        return this.prisma.usuario.update({
            where: { id },
            data: { ativo: false },
        });
    }
}
