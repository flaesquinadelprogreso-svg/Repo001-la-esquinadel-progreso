const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function borrarInventario() {
    try {
        console.log('Iniciando borrado de inventario...');

        // Eliminar movimientos de inventario o relacionados a productos si hay (depende de tu esquema)
        // await prisma.movimientoInventario.deleteMany({});

        // Primero eliminar el stock de las ubicaciones
        const stockEliminado = await prisma.stockUbicacion.deleteMany({});
        console.log(`✅ Stock eliminado de ubicaciones: ${stockEliminado.count} registros.`);

        // Luego eliminar los productos
        const productosEliminados = await prisma.producto.deleteMany({});
        console.log(`✅ Productos eliminados: ${productosEliminados.count} registros.`);

        // Opcional: Eliminar servicios si se considera parte del inventario
        // const serviciosEliminados = await prisma.servicio.deleteMany({});
        // console.log(`✅ Servicios eliminados: ${serviciosEliminados.count} registros.`);

        console.log('🎉 Inventario borrado exitosamente.');
    } catch (error) {
        console.error('❌ Error al borrar inventario:', error);
    } finally {
        await prisma.$disconnect();
    }
}

borrarInventario();
