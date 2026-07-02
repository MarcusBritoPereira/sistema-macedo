import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const centros = await prisma.centroCusto.findMany({ where: { aceitaLancamento: false } });
  console.log(centros.map(c => c.nome));
}
main().catch(console.error).finally(() => prisma.$disconnect());
