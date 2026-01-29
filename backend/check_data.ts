
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Database Counts ---');
    const clients = await prisma.cliente.count();
    const users = await prisma.usuario.count();

    console.log(`Clients: ${clients}`);
    console.log(`Users: ${users}`);

    if (clients > 0) {
        const firstClient = await prisma.cliente.findFirst();
        console.log('Sample Client:', firstClient?.razaoSocial);
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
