import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const hashedPassword = await bcrypt.hash(data.senha, 10);
    const { nome, email, perfil, ativo, permissoes } = data;

    // Handle profile connection by name if provided as string
    let perfilConnection = {};
    if (typeof data.perfil === 'string') {
      perfilConnection = {
        perfil: {
          connect: { nome: data.perfil },
        },
      };
    }

    const createData: any = {
      nome,
      email,
      ativo,
      senha: hashedPassword,
      permissoes: permissoes || [],
      ...perfilConnection,
    };

    return this.prisma.usuario.create({
      data: createData,
    });
  }

  findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        permissoes: true,
        createdAt: true,
      }, // Exclude password
    });
  }

  findOne(id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: { perfil: true },
    });
  }

  findOneSafe(id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        permissoes: true,
        precisaTrocarSenha: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: { perfil: true },
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    for (const field of [
      'nome',
      'email',
      'ativo',
      'precisaTrocarSenha',
      'permissoes'
    ] as const) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    if (data.senha && typeof data.senha === 'string') {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    // Handle profile connection by name if provided as string
    let perfilConnection = {};
    if (typeof data.perfil === 'string') {
      perfilConnection = {
        perfil: {
          connect: { nome: data.perfil },
        },
      };
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...updateData,
        ...perfilConnection,
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
