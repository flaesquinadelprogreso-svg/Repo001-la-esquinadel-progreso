import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.abonoCobro.deleteMany({});
    await prisma.abonoPago.deleteMany({});
    await prisma.cuentaPorCobrar.deleteMany({});
    await prisma.cuentaPorPagar.deleteMany({});
    console.log('Cuentas borradas');
}

main().catch(console.error).finally(() => prisma.$disconnect());
