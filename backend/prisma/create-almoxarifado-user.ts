import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'engenheiroandrelima96@gmail.com';
    const plainPassword = 'macedo.almoxarifado';
    const nome = 'André Lima (Almoxarifado)';

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Make sure ALMOXARIFADO profile exists
    const almoxarifadoProfile = await prisma.perfil.upsert({
        where: { nome: 'ALMOXARIFADO' },
        update: {},
        create: { nome: 'ALMOXARIFADO', descricao: 'Gestão de Estoque e Materiais', permissoes: { stock: true } },
    });

    const user = await prisma.usuario.upsert({
        where: { email },
        update: {
            senha: hashedPassword,
            nome: nome,
            perfilId: almoxarifadoProfile.id
        },
        create: {
            email,
            nome,
            senha: hashedPassword,
            perfilId: almoxarifadoProfile.id
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
