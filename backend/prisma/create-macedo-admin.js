const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@macedo.com.br';
    const plainPassword = 'macedo.admin';
    const nome = 'Admin Macedo';

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Make sure ADMIN profile exists
    const adminProfile = await prisma.perfil.upsert({
        where: { nome: 'ADMIN' },
        update: {},
        create: { nome: 'ADMIN', descricao: 'Acesso Total', permissoes: { all: true } },
    });

    const user = await prisma.usuario.upsert({
        where: { email },
        update: {
            senha: hashedPassword,
            nome: nome,
            perfilId: adminProfile.id
        },
        create: {
            email,
            nome,
            senha: hashedPassword,
            perfilId: adminProfile.id
        },
    });

    console.log(`\n✅ Usuário criado/atualizado com sucesso!`);
    console.log(`📧 E-mail: ${user.email}`);
    console.log(`🔑 Senha: ${plainPassword}\n`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
