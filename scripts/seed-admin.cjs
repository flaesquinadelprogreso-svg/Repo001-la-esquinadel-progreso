const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const username = process.env.ADMIN_USER || 'admin';
    const password = process.env.ADMIN_PASS || 'admin123';
    const role = 'admin';

    console.log(`Creando usuario inicial: ${username}...`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.usuario.upsert({
        where: { username },
        update: {
            password: hashedPassword,
            role: role,
        },
        create: {
            username,
            password: hashedPassword,
            role: role,
        },
    });

    console.log('✅ Usuario administrador creado/actualizado con éxito:', user.username);
}

main()
    .catch((e) => {
        console.error('❌ Error al crear el usuario:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
