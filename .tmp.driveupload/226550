import { PrismaClient, TipoCategoria, ClassificacaoDRE } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning Database...');

    const tables = [
        'conciliacoes_bancarias',
        'lancamentos_financeiros',
        'extratos_bancarios',
        'importacoes_bancarias',
        'integracoes_bancarias',
        'contas_bancarias',
        'contratos',
        'contatos',
        'leads',
        'clientes',
        'centros_custo',
        'categorias_financeiras',
        'orcamentos_financeiros',
        'parametros_fiscais',
        'logs_auditoria',
        'usuarios',
        'perfis'
    ];

    for (const table of tables) {
        try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
            console.log(`Deleted ${table}`);
        } catch (e) {
            console.warn(`Could not truncate ${table}: ${e}`);
        }
    }

    console.log('✨ All tables cleared.');
    console.log('🌱 Seeding minimal data (Admin & Defaults)...');

    // 1. Profiles
    const adminProfile = await prisma.perfil.create({
        data: { nome: 'ADMIN', descricao: 'Acesso Total', permissoes: { all: true } },
    });
    const finProfile = await prisma.perfil.create({
        data: { nome: 'FINANCEIRO', descricao: 'Gestão Financeira', permissoes: { financial: true } },
    });
    const salesProfile = await prisma.perfil.create({
        data: { nome: 'COMERCIAL', descricao: 'Gestão de Vendas', permissoes: { sales: true } },
    });

    // 2. Users (Password: 123456)
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('123456', salt);

    await prisma.usuario.create({
        data: { email: 'admin@erp.com', nome: 'Administrador', senha: password, perfilId: adminProfile.id },
    });
    console.log('User created: admin@erp.com / 123456');

    // 3. Categories
    const categoryGroups = [
        {
            nome: 'RECEITAS OPERACIONAIS', tipo: TipoCategoria.RECEITA, classificacao: ClassificacaoDRE.RECEITA_RECORRENTE,
            children: ['Contratos recorrentes', 'Aluguel do ponto', 'Cowork', 'Aluguel outdoor', 'Serviços avulsos']
        },
        {
            nome: 'DEDUÇÕES DA RECEITA', tipo: TipoCategoria.DESPESA, classificacao: ClassificacaoDRE.DEDUCOES_RECEITA,
            children: ['Impostos sobre faturamento', 'Comissões avulsas']
        },
        {
            nome: 'CUSTOS DOS SERVIÇOS PRESTADOS', tipo: TipoCategoria.DESPESA, classificacao: ClassificacaoDRE.CUSTO_SERVICOS_PRESTADOS,
            children: ['Remuneração de colaboradores', 'Serviços avulsos (terceiros)', 'Softwares e assinaturas (produção)', 'Equipamentos']
        },
        {
            nome: 'DESPESAS OPERACIONAIS – ADMINISTRATIVAS', tipo: TipoCategoria.DESPESA, classificacao: ClassificacaoDRE.DESPESA_ADMINISTRATIVA,
            children: ['Internet e telefonia', 'Softwares administrativos', 'Advogado', 'Contador', 'Aluguel', 'Energia']
        },
        {
            nome: 'DESPESAS COM SÓCIOS', tipo: TipoCategoria.DESPESA, classificacao: ClassificacaoDRE.DESPESA_SOCIOS,
            children: ['Pró-labore', 'Recolhimento de lucros']
        },
        {
            nome: 'DESPESAS FINANCEIRAS', tipo: TipoCategoria.DESPESA, classificacao: ClassificacaoDRE.DESPESA_FINANCEIRA,
            children: ['Juros e Encargos', 'Empréstimos', 'IOF', 'Tarifas Bancárias']
        }
    ];

    for (const group of categoryGroups) {
        const parent = await prisma.categoriaFinanceira.create({
            data: {
                nome: group.nome,
                tipo: group.tipo as TipoCategoria,
                classificacao: group.classificacao
            }
        });

        for (const childName of group.children) {
            await prisma.categoriaFinanceira.create({
                data: {
                    nome: childName,
                    tipo: group.tipo as TipoCategoria,
                    parentId: parent.id,
                    classificacao: group.classificacao
                }
            });
        }
    }
    console.log('Categories created.');

    // 4. Cost Centers
    await prisma.centroCusto.create({ data: { nome: 'Geral', codigo: '001' } });
    console.log('Cost Centers created.');

    console.log('✅ DATABASE RESET COMPLETE.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
