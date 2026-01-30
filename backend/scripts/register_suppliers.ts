
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXISTING_CATEGORIES: Record<string, string> = {
    internet: 'c9f1a17d-c535-49a2-89bf-330b67848e2d', // Internet e telefonia
    faturaCartao: '7edb137a-bc3f-4243-aae6-cf55827d740e', // Fatura do cartão
    emprestimos: '99854cd0-95b1-4d57-b168-a143143c5b7a', // Empréstimos
    energia: '0032c71a-bb48-4b9a-8c04-be5442c1a27e', // Energia
    aluguel: '793ca461-656d-46dd-ab63-5bb662217647', // Aluguel
    remuneracao: 'fa083ef4-75be-4a2b-b5cc-98da88fbcab3', // Remuneração de colaboradores
    proLabore: 'ca056a3a-8c00-4097-a111-e3303fbccac1', // Pró-labore
    comissoes: 'cd42e7a8-55c6-4347-a8d7-d11aad64a99e', // Comissões avulsas
    advogado: 'a99e7ad3-d9a7-40c9-a246-fb26bf76b2df', // Advogado
    contador: '4927e077-20cc-4565-a5ee-a74d8affa273', // Contador
    impostos: '2fbe1c35-d3ff-417f-b2b7-0b426c515598', // Impostos sobre faturamento
};

// Suppliers to register: [Name, Category Key or New Category Name]
const SUPPLIERS_LIST = [
    ['AD Sumus', 'Segurança'],
    ['Internet', 'internet'],
    ['Cartão Rose', 'faturaCartao'],
    ['Cartão UP', 'faturaCartao'],
    ['Placa solar Boleto', 'energia'], // Energia Solar -> Energia
    ['Leandro (Emprestimo)', 'emprestimos'],
    ['Tania (Emprestimo)', 'emprestimos'],
    ['Placa solar (Alessandro)', 'energia'], // Energia Solar -> Energia
    ['Energia', 'energia'],
    ['Aluguel', 'aluguel'],
    ['Paulo', 'remuneracao'],
    ['Messias', 'remuneracao'],
    ['Leyla (Essencial)', 'remuneracao'],
    ['Leyla (Comercial)', 'remuneracao'],
    ['Ludmila', 'remuneracao'],
    ['Nelson', 'proLabore'],
    ['Marcus (Coordenador)', 'remuneracao'],
    ['Allaf', 'remuneracao'],
    ['Aira', 'remuneracao'],
    ['Raquel', 'remuneracao'],
    ['Júnior (Maria do Carmo)', 'comissoes'],
    ['Gustavo', 'remuneracao'],
    ['Alessandro', 'proLabore'],
    ['Rosi (Jurídico)', 'advogado'],
    ['Rosi', 'remuneracao'],
    ['Abner', 'remuneracao'],
    ['Naldo', 'remuneracao'],
    ['Julia', 'remuneracao'],
    ['Kidney', 'remuneracao'],
    ['Mailson', 'remuneracao'],
    ['Ibrahim', 'remuneracao'],
    ['Walber', 'remuneracao'],
    ['Urbano', 'Transporte Urbano'],
    ['Luís Carlos', 'comissoes'],
    ['Átila sociedade', 'Negociação de capital social'],
    ['DAS', 'impostos'],
    ['Contador', 'contador'],
    ['Kaleb', 'comissoes'],
];

async function getOrCreateCategory(nameOrKey: string): Promise<string> {
    // Check if it's a mapped key
    if (EXISTING_CATEGORIES[nameOrKey]) {
        return EXISTING_CATEGORIES[nameOrKey];
    }

    // Otherwise, check if category exists by name
    const existing = await prisma.categoriaFinanceira.findFirst({
        where: { nome: nameOrKey }
    });

    if (existing) {
        return existing.id;
    }

    // Create new category
    console.log(`Creating new category: ${nameOrKey}`);
    const created = await prisma.categoriaFinanceira.create({
        data: {
            nome: nameOrKey,
            tipo: 'DESPESA', // Assuming all are expenses
        }
    });
    return created.id;
}

async function main() {
    console.log('--- REGISTERING SUPPLIERS ---');

    for (const [name, catKey] of SUPPLIERS_LIST) {
        try {
            const categoryId = await getOrCreateCategory(catKey);

            const existing = await prisma.fornecedor.findFirst({
                where: { nomeFantasia: name }
            });

            if (existing) {
                console.log(`Updating ${name}...`);
                await prisma.fornecedor.update({
                    where: { id: existing.id },
                    data: { categoriaDefaultId: categoryId }
                });
            } else {
                console.log(`Creating ${name}...`);
                await prisma.fornecedor.create({
                    data: {
                        nomeFantasia: name,
                        categoriaDefaultId: categoryId
                    }
                });
            }
        } catch (error) {
            console.error(`Error processing ${name}:`, error);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
