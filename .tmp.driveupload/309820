const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.usuario.findUnique({
    where: { id: 'e896de03-3fdf-47b8-8407-266d6d587e6e' },
    include: { perfil: true }
  });
  console.log('USER_INFO:', JSON.stringify(user));
}
main().catch(console.error).finally(() => prisma.$disconnect());
