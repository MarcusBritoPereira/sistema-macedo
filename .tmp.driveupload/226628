
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const integrations = await prisma.integracaoBancaria.findMany({
        include: { contaBancaria: true }
    });
    console.log(JSON.stringify(integrations, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
