
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting User ---');
    const user = await prisma.usuario.findUnique({
        where: { id: 'e896de03-3fdf-47b8-8407-266d6d587e6e' },
        include: { perfil: true }
    });
    console.log('User:', JSON.stringify(user, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
