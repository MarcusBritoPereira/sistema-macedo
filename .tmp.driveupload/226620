
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const client = await prisma.cliente.findFirst({
        where: { razaoSocial: { contains: 'Recanto do Amanhã', mode: 'insensitive' } },
        include: { contratos: true }
    });

    if (!client) {
        console.log('Client not found');
        return;
    }

    console.log('Client:', client.razaoSocial, client.id);
    console.log('Contracts:', JSON.stringify(client.contratos, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
