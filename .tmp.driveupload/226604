import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start clearing ALL reconciliation imports...');

    // 1. Delete all ConciliacaoBancaria records (First due to FK)
    const deletedConciliations = await prisma.conciliacaoBancaria.deleteMany({});
    console.log(`Deleted ${deletedConciliations.count} conciliation records.`);

    // 2. Reset LancamentoFinanceiro (status: CONCILIADO -> REALIZADO)
    const updatedTransactions = await prisma.lancamentoFinanceiro.updateMany({
        where: { status: 'CONCILIADO' },
        data: { status: 'REALIZADO' },
    });
    console.log(`Reset ${updatedTransactions.count} financial transactions to REALIZADO status.`);

    // 3. Delete all ExtratoBancario records
    const deletedStatements = await prisma.extratoBancario.deleteMany({});
    console.log(`Deleted ${deletedStatements.count} bank statement records.`);

    // 4. Delete all ImportacaoBancaria records (Parent of ExtratoBancario)
    const deletedImports = await prisma.importacaoBancaria.deleteMany({});
    console.log(`Deleted ${deletedImports.count} import batch records.`);

    console.log('Finished comprehensive cleanup of reconciliation data.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
