import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start removing dummy users...');

    const emailsToRemove = [
        'pedro.fiscal@macedo.com',
        'mariana.suprimentos@macedo.com',
        'ricardo.engenharia@macedo.com',
        'carlos.diretor@macedo.com'
    ];

    const result = await prisma.usuario.deleteMany({
        where: {
            email: {
                in: emailsToRemove
            }
        }
    });

    console.log(`Removed ${result.count} dummy users.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
