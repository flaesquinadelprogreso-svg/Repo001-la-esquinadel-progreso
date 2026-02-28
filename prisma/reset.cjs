/**
 * RESET: Limpia todos los datos transaccionales para entrega al cliente.
 *
 * ELIMINA: ventas, compras, movimientos, clientes, proveedores, productos,
 *          servicios, cuentas por cobrar/pagar, cierres de caja, stock.
 *
 * MANTIENE: usuarios (admin), roles, configuración, cuentas financieras
 *           (con saldo en 0), ubicaciones, resoluciones (reseteadas).
 *
 * Uso: node prisma/reset.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
    console.log('=== RESET DEL SISTEMA ===\n');

    // Orden de eliminación respetando foreign keys (hijos primero)
    const deletions = [
        // 1. Movimientos y pagos (dependen de ventas, cuentas, abonos)
        { model: 'movimientoCajaDevolucion', label: 'Movimientos devolución' },
        { model: 'movimientoCaja', label: 'Movimientos de caja' },
        { model: 'pagoVenta', label: 'Pagos de venta' },

        // 2. Items (dependen de ventas, compras, devoluciones)
        { model: 'itemDevolucion', label: 'Items devolución' },
        { model: 'itemVenta', label: 'Items venta' },
        { model: 'itemCompra', label: 'Items compra' },

        // 3. Devoluciones (dependen de ventas)
        { model: 'devolucion', label: 'Devoluciones' },

        // 4. Abonos (dependen de cuentas por cobrar/pagar)
        { model: 'abonoCobro', label: 'Abonos cobro' },
        { model: 'abonoPago', label: 'Abonos pago' },

        // 5. Cuentas por cobrar/pagar (dependen de clientes/proveedores)
        { model: 'cuentaPorCobrar', label: 'Cuentas por cobrar' },
        { model: 'cuentaPorPagar', label: 'Cuentas por pagar' },

        // 6. Ventas y compras
        { model: 'venta', label: 'Ventas' },
        { model: 'compra', label: 'Compras' },

        // 7. Cierres de caja
        { model: 'cierreCaja', label: 'Cierres de caja' },

        // 8. Stock
        { model: 'stockUbicacion', label: 'Stock ubicaciones' },

        // 9. Datos maestros que el cliente cargará
        { model: 'producto', label: 'Productos' },
        { model: 'servicio', label: 'Servicios' },
        { model: 'cliente', label: 'Clientes' },
        { model: 'proveedor', label: 'Proveedores' },
    ];

    for (const { model, label } of deletions) {
        const count = await prisma[model].deleteMany();
        console.log(`  ✓ ${label}: ${count.count} registros eliminados`);
    }

    // Resetear saldos de cuentas financieras a 0
    const cuentas = await prisma.cuentaFinanciera.updateMany({
        data: { saldoActual: 0 }
    });
    console.log(`  ✓ Cuentas financieras: ${cuentas.count} saldos reseteados a 0`);

    // Resetear resoluciones: actual = desde
    const resoluciones = await prisma.resolucion.findMany();
    for (const res of resoluciones) {
        await prisma.resolucion.update({
            where: { id: res.id },
            data: { actual: res.desde }
        });
    }
    console.log(`  ✓ Resoluciones: ${resoluciones.length} reseteadas al inicio`);

    // Resetear configuración a valores genéricos
    await prisma.configuracion.updateMany({
        data: {
            nombreEmpresa: 'Mi Empresa',
            nit: null,
            direccion: null,
            telefono: null,
            email: null,
        }
    });
    console.log('  ✓ Configuración: reseteada a valores genéricos');

    // Eliminar usuarios no-admin (el cliente creará los suyos)
    const usuariosEliminados = await prisma.usuario.deleteMany({
        where: { role: { not: 'admin' } }
    });
    console.log(`  ✓ Usuarios no-admin: ${usuariosEliminados.count} eliminados`);

    console.log('\n=== RESET COMPLETADO ===');
    console.log('\nEl sistema está listo para el cliente.');
    console.log('Solo debe:');
    console.log('  1. Entrar con admin/admin123');
    console.log('  2. Actualizar configuración (nombre empresa, NIT, etc.)');
    console.log('  3. Crear ubicaciones/bodegas si necesita');
    console.log('  4. Cargar productos');
    console.log('  5. Abrir caja con saldo inicial');
    console.log('  6. Crear usuarios y asignar roles\n');
}

reset()
    .catch(e => { console.error('Error en reset:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
