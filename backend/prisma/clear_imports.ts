import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start clearing ALL reconciliation imports...');

    // 1. Delete all ConciliacaoBancaria records (First due to FK)
    const deletedConciliations = await prisma.conciliacaoBancaria.deleteMany({});
    console.log(`Deleted ${deletedConciliations.count} conciliation records.`);

    // 2. Reset LancamentoFinanceiro (status: CONCILIADO -> REALIZADO)
    // We keep them as REALIZADO because the payment likely happened, just the statement connection is gone.
    const updatedTransactions = await prisma.lancamentoFinanceiro.updateMany({
        where: { status: 'CONCILIADO' },
        data: { status: 'REALIZADO' },
    });
    console.log(`Reset ${updatedTransactions.count} financial transactions to REALIZADO status.`);

    // 3. Delete all ExtratoBancario records
    const deletedStatements = await prisma.extratoBancario.deleteMany({});
    console.log(`Deleted ${deletedStatements.count} bank statement records.`);

    console.log('Finished cleanup of imports.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
