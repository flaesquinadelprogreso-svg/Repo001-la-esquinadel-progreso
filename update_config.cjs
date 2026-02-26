const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Update Company Info
    await prisma.configuracion.upsert({
        where: { id: 1 },
        update: {
            nombreEmpresa: "MI EMPRESA",
            nit: "900123456-1"
        },
        create: {
            id: 1,
            nombreEmpresa: "MI EMPRESA",
            nit: "900123456-1"
        }
    });
    console.log("✅ Configuración de empresa actualizada.");

    // 2. Update active resolution prefix if it exists to match the requested FCT
    const activeRes = await prisma.resolucion.findFirst({
        where: { activo: true }
    });
    if (activeRes) {
        await prisma.resolucion.update({
            where: { id: activeRes.id },
            data: { prefijo: "FCT" }
        });
        console.log("✅ Prefijo de resolución actualizado a FCT.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
