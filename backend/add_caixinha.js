const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.contaBancaria.create({
    data: {
      nome: 'Caixinha (Dinheiro em Espécie)',
      banco: 'Caixa Interno',
      codigoBanco: '999',
      agencia: '',
      conta: '',
      saldoInicial: 0
    }
  });
  console.log('Caixinha criada com sucesso!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
