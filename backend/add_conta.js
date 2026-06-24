const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.contaBancaria.create({
    data: {
      nome: 'MACEDO CONSTRUTORA LTDA (Sicredi)',
      banco: 'Banco Cooperativo Sicredi S.A. - Bansicredi',
      codigoBanco: '748',
      agencia: '0818',
      conta: '08039-3',
      saldoInicial: 0
    }
  });
  console.log('Conta criada com sucesso!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
