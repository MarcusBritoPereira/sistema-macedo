import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Check ---');
  
  const count = await prisma.lancamentoFinanceiro.count();
  console.log('Total Lancamentos:', count);

  const statusCounts = await prisma.lancamentoFinanceiro.groupBy({
    by: ['status', 'tipo'],
    _count: true,
  });
  console.log('Status Counts:', JSON.stringify(statusCounts, null, 2));

  const sample = await prisma.lancamentoFinanceiro.findMany({
    take: 5,
    orderBy: { dataVencimento: 'desc' },
  });
  console.log('Sample Lancamentos:', JSON.stringify(sample, null, 2));

  const now = new Date();
  console.log('Current system date:', now.toISOString());

  // Check how many have dataPagamento in the last 14 days relative to now
  const dailyFlowStart = new Date(now);
  dailyFlowStart.setDate(dailyFlowStart.getDate() - 13);
  dailyFlowStart.setHours(0, 0, 0, 0);
  console.log('dailyFlowStart:', dailyFlowStart.toISOString());

  const countRecent = await prisma.lancamentoFinanceiro.count({
    where: {
      dataPagamento: { gte: dailyFlowStart, lte: now }
    }
  });
  console.log('Recent paid Lancamentos (last 14 days):', countRecent);

  const allRecent = await prisma.lancamentoFinanceiro.findMany({
    where: {
      dataPagamento: { gte: dailyFlowStart, lte: now }
    }
  });
  console.log('All recent paid Lancamentos:', JSON.stringify(allRecent, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
