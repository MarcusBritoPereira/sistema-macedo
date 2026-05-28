const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.contaBancaria.updateMany({
    where: { conta: '08039-3' },
    data: { nome: 'Sicredi' }
  });
  console.log('Account renamed to Sicredi successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
