import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClassificationEngineService implements OnModuleInit {
  private regrasBase = [
    { padrao: 'canva', categoria: 'Softwares e assinaturas' },
    { padrao: 'adobe', categoria: 'Softwares e assinaturas' },
    { padrao: 'envato', categoria: 'Softwares e assinaturas' },
    { padrao: 'google', categoria: 'Softwares e assinaturas' },
    { padrao: 'chat gpt', categoria: 'Softwares e assinaturas' },
    { padrao: 'reportei', categoria: 'Softwares administrativos' },
    { padrao: 'restaurant', categoria: 'Lanches e refeições' },
    { padrao: 'almoco', categoria: 'Lanches e refeições' },
    { padrao: 'ifood', categoria: 'Lanches e refeições' },
    { padrao: 'camera', categoria: 'Equipamentos' },
    { padrao: 'htm', categoria: 'Organização de eventos' },
    { padrao: 'blueberry', categoria: 'Mentoria' },
    { padrao: 'iof', categoria: 'IOF' }
  ];

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedRegrasBase();
  }

  private async seedRegrasBase() {
    try {
      // Find matching categories in DB
      const dbCategories = await this.prisma.categoriaFinanceira.findMany({
        where: { tipo: 'DESPESA' }
      });

      for (const regra of this.regrasBase) {
        // Try to match category name loosely. If we don't find it exactly, we map it loosely
        const match = dbCategories.find(c => c.nome.toLowerCase() === regra.categoria.toLowerCase()) || 
                      dbCategories.find(c => c.nome.toLowerCase().includes(regra.categoria.toLowerCase().split(' ')[0]));
        
        const existing = await this.prisma.regraClassificacao.findUnique({
          where: { padraoTexto: regra.padrao.toLowerCase() }
        });

        if (!existing) {
          await this.prisma.regraClassificacao.create({
            data: {
              padraoTexto: regra.padrao.toLowerCase(),
              categoriaId: match ? match.id : null,
              subcategoriaId: !match ? regra.categoria : null // Fallback to storing in subcategoria if category not found
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to seed classification rules:', e);
    }
  }

  async classificarTransacao(descricao: string): Promise<{ categoriaId: string | null; subcategoriaId: string | null; confianca: number }> {
    const regras = await this.prisma.regraClassificacao.findMany({
      orderBy: { prioridade: 'desc' }
    });

    const descLower = descricao.toLowerCase();

    for (const regra of regras) {
      if (descLower.includes(regra.padraoTexto)) {
        return {
          categoriaId: regra.categoriaId,
          subcategoriaId: regra.subcategoriaId,
          confianca: 0.9
        };
      }
    }

    return {
      categoriaId: null,
      subcategoriaId: null,
      confianca: 0.0
    };
  }

  async aprenderRegra(descricao: string, categoriaId: string | null, subcategoriaId: string | null) {
    if (!categoriaId && !subcategoriaId) return;

    // A very simple heuristic: 
    // Take the first substantial word of the description if it's one we haven't seen.
    // In a real strict implementation, we would extract entities. 
    // For now, we take the entire description up to the first number or special character, cleaned up.
    let padraoTexto = descricao.toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (padraoTexto.length < 3) return;
    
    // Simplification: use the whole description
    const padraoEncontrado = padraoTexto.substring(0, 30); // limit length

    const existing = await this.prisma.regraClassificacao.findFirst({
      where: { padraoTexto: { contains: padraoEncontrado } }
    });

    if (!existing) {
      await this.prisma.regraClassificacao.create({
        data: {
          padraoTexto: padraoEncontrado,
          categoriaId,
          subcategoriaId,
          prioridade: 1 // Learned rules have slightly higher priority than base
        }
      });
    }
  }
}
