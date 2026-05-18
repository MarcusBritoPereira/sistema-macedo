
import { PrismaClient, TipoCategoria, StatusContrato, TipoLancamento, StatusLancamento, ClassificacaoDRE } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting V2 SEED...');

    // 1. Profiles
    const adminProfile = await prisma.perfil.upsert({
        where: { nome: 'ADMIN' },
        update: {},
        create: { nome: 'ADMIN', descricao: 'Acesso Total', permissoes: { all: true } },
    });

    const finProfile = await prisma.perfil.upsert({
        where: { nome: 'FINANCEIRO' },
        update: {},
        create: { nome: 'FINANCEIRO', descricao: 'Gestão Financeira', permissoes: { financial: true } },
    });

    // 3. User Seed - Skipped Sales Profile

    const defaultSeedPassword = process.env.SEED_DEFAULT_PASSWORD;
    const isDev = process.env.NODE_ENV !== 'production';
    if (!defaultSeedPassword && !isDev) {
        throw new Error('SEED_DEFAULT_PASSWORD é obrigatória fora de ambiente local.');
    }
    const seedPassword = defaultSeedPassword || '123456';

    // 2. Users
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash(seedPassword, salt);

    await prisma.usuario.upsert({
        where: { email: 'admin@erp.com' },
        update: {},
        create: { email: 'admin@erp.com', nome: 'Administrador', senha: password, perfilId: adminProfile.id },
    });

    await prisma.usuario.upsert({
        where: { email: 'financeiro@erp.com' },
        update: {},
        create: { email: 'financeiro@erp.com', nome: 'Ana Financeira', senha: password, perfilId: finProfile.id },
    });




    // 3. Categories (Hierarchical V2)
    console.log('Cleaning Financial Data...');
    await prisma.lancamentoFinanceiro.deleteMany({});
    await prisma.categoriaFinanceira.deleteMany({});

    console.log('Seeding Hierarchy...');

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

    const categoryMap = new Map<string, string>(); // Name -> ID
    const subCategoryIds: string[] = [];

    for (const group of categoryGroups) {
        const parent = await prisma.categoriaFinanceira.create({
            data: {
                nome: group.nome,
                tipo: group.tipo as TipoCategoria,
                classificacao: group.classificacao
            }
        });
        categoryMap.set(group.nome, parent.id);

        for (const childName of group.children) {
            const child = await prisma.categoriaFinanceira.create({
                data: {
                    nome: childName,
                    tipo: group.tipo as TipoCategoria,
                    parentId: parent.id,
                    classificacao: group.classificacao
                }
            });
            subCategoryIds.push(child.id);
            categoryMap.set(childName, child.id);
        }
    }

    // 4. Cost Centers
    const costCentersData = [
        { nome: 'Geral', codigo: '001' },
        { nome: 'TI / Desenvolvimento', codigo: '002' },
        { nome: 'Comercial', codigo: '003' },
    ];

    const costCenters: any[] = [];
    for (const cc of costCentersData) {
        let c = await prisma.centroCusto.findFirst({ where: { codigo: cc.codigo } });
        if (!c) {
            c = await prisma.centroCusto.create({ data: cc });
        }
        costCenters.push(c);
    }

    // 5. Clients
    const clientNames = ["Dxtra Inc", "Bill Car", "Machado Lima", "Precisa Engenharia", "Maximus BBQ", "Sushi Santarem"];
    const clients: any[] = [];

    for (const name of clientNames) {
        let c = await prisma.cliente.findFirst({
            where: { OR: [{ razaoSocial: name }, { nomeFantasia: name }] }
        });

        if (!c) {
            c = await prisma.cliente.create({
                data: {
                    razaoSocial: name,
                    nomeFantasia: name,
                    cnpj: `00.000.000/${Math.floor(Math.random() * 10000)}`,
                    email: `contato@${name.replace(/\s/g, '').toLowerCase()}.com`,
                    ativo: true
                }
            });
        }
        clients.push(c);
    }

    // 5.1. Bank Accounts
    console.log('Generating Bank Accounts...');
    const bankAccountsData = [
        { nome: 'Banco Inter', banco: 'Banco Inter', saldoInicial: 5000 },
        { nome: 'Caixinha Reserva', banco: 'NuBank', saldoInicial: 1500 },
    ];

    const bankAccounts: any[] = [];
    for (const acc of bankAccountsData) {
        let a = await prisma.contaBancaria.findFirst({ where: { nome: acc.nome } });
        if (!a) {
            a = await prisma.contaBancaria.create({ data: acc });
        }
        bankAccounts.push(a);
    }

    // 6. Contracts
    console.log('Generating Contracts...');
    for (const client of clients) {
        const existing = await prisma.contrato.findFirst({ where: { clienteId: client.id } });
        if (!existing) {
            await prisma.contrato.create({
                data: {
                    descricao: `Contrato ${client.nomeFantasia}`,
                    valorMensal: Math.floor(Math.random() * 5000) + 1000,
                    dataInicio: new Date(),
                    ativo: true,
                    status: StatusContrato.ATIVO,
                    clienteId: client.id,
                    diaVencimento: 10
                }
            });
        }
    }

    // 7. Financial Records (LancamentoFinanceiro)
    console.log('Generating V2 Financial Records...');

    // Dates
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 1);
    const getRandomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    // Create 50 random transactions
    for (let i = 0; i < 50; i++) {
        const isReceita = Math.random() > 0.5;
        const tipo: TipoLancamento = isReceita ? 'RECEITA' : 'DESPESA';
        const valor = Math.floor(Math.random() * 5000) + 100;
        const vencimento = getRandomDate(startDate, endDate);

        // Status logic
        let status: StatusLancamento = 'PREVISTO';
        let dataPagamento: Date | null = null;

        if (vencimento < today) {
            const r = Math.random();
            if (r > 0.8) status = 'CANCELADO'; // 20% cancelled
            else if (r > 0.3) { // 50% realized
                status = 'REALIZADO';
                dataPagamento = vencimento;
            }
            // 30% still PREVISTO (Overdue)
        }

        const client = clients[Math.floor(Math.random() * clients.length)];
        const catId = subCategoryIds[Math.floor(Math.random() * subCategoryIds.length)];

        await prisma.lancamentoFinanceiro.create({
            data: {
                descricao: `${tipo === 'RECEITA' ? 'Recebimento' : 'Pagamento'} ${i} - ${client.nomeFantasia}`,
                valor,
                dataVencimento: vencimento,
                dataPagamento,
                status,
                tipo,
                categoriaId: catId,
                centroCustoId: costCenters[0].id,
                clienteId: tipo === 'RECEITA' ? client.id : undefined,
                contaBancariaId: bankAccounts[0].id
            }
        });
    }


    console.log('✅ V2 SEED COMPLETE!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
