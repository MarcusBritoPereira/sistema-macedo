import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Clearing Pending Reconciliations (Unmatched Bank Items)...');

    const result = await prisma.extratoBancario.deleteMany({
        where: {
            conciliado: false
        }
    });

    console.log(`✨ Deleted ${result.count} unconciled bank statement items.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
