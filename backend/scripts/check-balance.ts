
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.contaBancaria.findMany({
        include: {
            integracao: true
        }
    });

    console.log(`Found ${accounts.length} bank accounts.`);

    for (const acc of accounts) {
        const latestExtrato = await prisma.extratoBancario.findFirst({
            where: {
                importacao: {
                    contaBancariaId: acc.id
                }
            },
            orderBy: {
                data: 'desc'
            }
        });

        // Alternatively, check distinct ExtratoBancario linked via importacao is tricky if not direct relation.
        // Actually ExtratoBancario has importacaoId, and ImportacaoBancaria has contaBancariaId
        // But we can also query ExtratoBancario where importacao.contaBancariaId = acc.id

        const latestStatement = await prisma.extratoBancario.findFirst({
            where: {
                importacao: {
                    contaBancariaId: acc.id
                }
            },
            orderBy: {
                data: 'desc'
            }
        });

        console.log(`\nAccount: ${acc.nome} (${acc.banco})`);
        if (latestStatement) {
            console.log(`Latest Statement Date: ${latestStatement.data.toISOString().split('T')[0]}`);
            console.log(`Balance Recorded: ${latestStatement.balance ?? 'N/A'}`);
        } else {
            console.log('No statements found.');
            console.log(`Initial Balance: ${acc.saldoInicial}`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
