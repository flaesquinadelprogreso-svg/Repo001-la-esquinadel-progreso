const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando limpieza de base de datos para inauguración...');

    // Orden estricto para no violar Foreign Keys (de los hijos a los padres)

    // 1. Limpiar Devoluciones (Depende de Ventas y Movimientos)
    await prisma.movimientoCajaDevolucion.deleteMany();
    await prisma.itemDevolucion.deleteMany();
    await prisma.devolucion.deleteMany();

    // 2. Limpiar Movimientos de Caja generales
    await prisma.movimientoCaja.deleteMany();

    // 3. Limpiar Cuentas por Cobrar y sus Abonos
    await prisma.abonoCobro.deleteMany();
    await prisma.cuentaPorCobrar.deleteMany();

    // 4. Limpiar Cuentas por Pagar y sus Abonos
    await prisma.abonoPago.deleteMany();
    await prisma.cuentaPorPagar.deleteMany();

    // 5. Limpiar Ventas y sus dependencias (Pagos, Items)
    await prisma.pagoVenta.deleteMany();
    await prisma.itemVenta.deleteMany();
    await prisma.venta.deleteMany();

    // 6. Limpiar Compras y sus Items
    await prisma.itemCompra.deleteMany();
    await prisma.compra.deleteMany();

    // 7. Limpiar Stock de Ubicaciones antes que los productos
    await prisma.stockUbicacion.deleteMany();

    // 8. Limpiar Catálogos y Entidades base
    await prisma.producto.deleteMany();
    await prisma.servicio.deleteMany();
    await prisma.cliente.deleteMany({
        where: {
            nombre: { not: 'General / Sin Registrar' } // Preservar cliente 'General'
        }
    });

    // Solo borrar proveedores que no sean críticos (opcional)
    await prisma.proveedor.deleteMany();

    // 9. Reiniciar saldos de todas las Cajas y Bancos a 0
    await prisma.cuentaFinanciera.updateMany({
        data: {
            saldoActual: 0
        }
    });

    console.log('✅ Base de datos transaccional VACIADA.');
    console.log('✅ El usuario "admin" sigue existiendo.');
    console.log('✅ Configuración (Ubicaciones, Cuentas Bancarias, Cliente General) intacta.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
