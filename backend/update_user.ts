import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.usuario.findUnique({ where: { email: 'engenheiroandrelima96@gmail.com' } });
  if (!user) {
    console.log("User not found");
    return;
  }
  
  const perfil = await prisma.perfil.findFirst({ where: { nome: 'ESTOQUE' } });
  if (!perfil) {
    console.log("Perfil ESTOQUE not found");
    return;
  }
  
  await prisma.usuario.update({
    where: { email: 'engenheiroandrelima96@gmail.com' },
    data: { perfilId: perfil.id }
  });
  console.log("User updated to ESTOQUE");
}
main().finally(() => prisma.$disconnect());
