
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.categoriaFinanceira.findMany();
    console.log('--- CATEGORIES ---');
    categories.forEach(c => {
        console.log(`${c.id} | ${c.nome} | ${c.tipo}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
