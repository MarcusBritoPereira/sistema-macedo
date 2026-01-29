import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start clearing ALL financial records...');

    // 1. Delete all ConciliacaoBancaria records (First due to FK on LancamentoFinanceiro)
    const deletedConciliations = await prisma.conciliacaoBancaria.deleteMany({});
    console.log(`Deleted ${deletedConciliations.count} conciliation records.`);

    // 2. Delete all LancamentoFinanceiro records (This covers CP, CR, and Cash Flow)
    const deletedTransactions = await prisma.lancamentoFinanceiro.deleteMany({});
    console.log(`Deleted ${deletedTransactions.count} financial transactions (CP/CR/CashFlow).`);

    console.log('Finished cleanup of financial records.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
