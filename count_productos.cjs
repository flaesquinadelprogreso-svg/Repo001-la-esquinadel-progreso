const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function count() {
    const c = await prisma.producto.count();
    console.log("Total Productos:", c);
    process.exit(0);
}
count();
