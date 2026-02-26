const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log('--- DIAGNÓSTICO DE DATOS FINANCIEROS ---');

    const ventasRaw = await prisma.venta.findMany({
        where: { estado: "completada" },
        include: {
            items: { include: { producto: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    ventasRaw.forEach(v => {
        console.log(`\nVenta: ${v.numeroRecibo} - Subtotal: ${v.subtotal}`);
        v.items.forEach(i => {
            console.log(`  Item: ${i.nombre}`);
            console.log(`    valor_compra_total (DB): ${i.valor_compra_total}`);
            console.log(`    producto.costo (DB): ${i.producto?.costo}`);
            console.log(`    cantidad: ${i.cantidad}`);
            console.log(`    precioUnit: ${i.precioUnit}`);

            const costoTotal = i.valor_compra_total || (i.producto?.costo || 0) * i.cantidad;
            const ventaTotal = i.valor_venta_total || (i.precioUnit * i.cantidad);
            const gananciaItem = i.ganancia || (ventaTotal - costoTotal);

            console.log(`    Cálculo -> CostoTotal: ${costoTotal}, VentaTotal: ${ventaTotal}, Ganancia: ${gananciaItem}`);
        });
    });

    await prisma.$disconnect();
}

debug();
