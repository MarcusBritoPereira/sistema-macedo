import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Counts of All Key Tables ===');
  
  const usuario = await prisma.usuario.count();
  const perfil = await prisma.perfil.count();
  const cliente = await prisma.cliente.count();
  const fornecedor = await prisma.fornecedor.count();
  const obra = await prisma.obra.count();
  const centroCusto = await prisma.centroCusto.count();
  const contaBancaria = await prisma.contaBancaria.count();
  const importacaoBancaria = await prisma.importacaoBancaria.count();
  const extratoBancario = await prisma.extratoBancario.count();
  const conciliacaoBancaria = await prisma.conciliacaoBancaria.count();
  const lancamentoFinanceiro = await prisma.lancamentoFinanceiro.count();

  console.log(`usuarios: ${usuario}`);
  console.log(`perfis: ${perfil}`);
  console.log(`clientes: ${cliente}`);
  console.log(`fornecedores: ${fornecedor}`);
  console.log(`obras: ${obra}`);
  console.log(`centrosCusto: ${centroCusto}`);
  console.log(`contasBancarias: ${contaBancaria}`);
  console.log(`importacoesBancarias: ${importacaoBancaria}`);
  console.log(`extratosBancarios: ${extratoBancario}`);
  console.log(`conciliacoesBancarias: ${conciliacaoBancaria}`);
  console.log(`lancamentosFinanceiros: ${lancamentoFinanceiro}`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
