import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Shifting Dates to Current Period ---');

  // Find max date
  const maxDates = await prisma.lancamentoFinanceiro.aggregate({
    _max: {
      dataVencimento: true,
      dataPagamento: true,
    },
  });

  const maxDate = maxDates._max.dataPagamento || maxDates._max.dataVencimento;
  if (!maxDate) {
    console.log('No records found to shift.');
    return;
  }

  const today = new Date();
  const diffTime = today.getTime() - maxDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  console.log(`Max date in DB: ${maxDate.toISOString()}`);
  console.log(`Today's date: ${today.toISOString()}`);
  console.log(`Shifting all dates forward by ${diffDays} days...`);

  if (diffDays <= 0) {
    console.log('No shift needed, data is already up to date.');
    return;
  }

  // Fetch all lancamentos
  const lancamentos = await prisma.lancamentoFinanceiro.findMany({
    select: {
      id: true,
      dataVencimento: true,
      dataPagamento: true,
      dataCompetencia: true,
    },
  });

  console.log(`Updating ${lancamentos.length} lancamentos...`);

  let updatedCount = 0;
  for (const l of lancamentos) {
    const newVencimento = new Date(l.dataVencimento.getTime() + diffTime);
    const newPagamento = l.dataPagamento ? new Date(l.dataPagamento.getTime() + diffTime) : null;
    const newCompetencia = l.dataCompetencia ? new Date(l.dataCompetencia.getTime() + diffTime) : null;

    await prisma.lancamentoFinanceiro.update({
      where: { id: l.id },
      data: {
        dataVencimento: newVencimento,
        dataPagamento: newPagamento,
        dataCompetencia: newCompetencia,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully shifted ${updatedCount} lancamentos by ${diffDays} days!`);

  // Let's verify
  const newRange = await prisma.lancamentoFinanceiro.aggregate({
    _min: { dataVencimento: true, dataPagamento: true },
    _max: { dataVencimento: true, dataPagamento: true },
  });
  console.log('New Range:', JSON.stringify(newRange));

  await prisma.$disconnect();
}

main().catch(console.error);
