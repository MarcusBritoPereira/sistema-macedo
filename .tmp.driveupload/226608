import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('admin123', salt);

    const updatedUser = await prisma.usuario.update({
        where: { email: 'admin@erp.com' },
        data: {
            senha: password,
        },
    });

    console.log('Password reset for:', updatedUser.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
