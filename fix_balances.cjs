const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Show current state
    const cuentas = await prisma.cuentaFinanciera.findMany();
    console.log('=== CUENTAS ANTES ===');
    cuentas.forEach(c => console.log(`  ${c.nombre} (${c.tipo}): $${c.saldoActual.toLocaleString()}`));

    // 2. Reset all accounts to 0
    for (const c of cuentas) {
        await prisma.cuentaFinanciera.update({
            where: { id: c.id },
            data: { saldoActual: 0 }
        });
    }

    // 3. Recalculate balances from actual movements
    const movimientos = await prisma.movimientoCaja.findMany({
        include: { cuenta: true }
    });

    const balances = {};
    for (const mov of movimientos) {
        if (!balances[mov.cuentaId]) balances[mov.cuentaId] = 0;
        if (mov.tipo === 'entrada') {
            balances[mov.cuentaId] += mov.monto;
        } else {
            balances[mov.cuentaId] -= mov.monto;
        }
    }

    // 4. Apply recalculated balances
    for (const [cuentaId, saldo] of Object.entries(balances)) {
        // If recalculated balance is negative, set to 0 (the bad data caused it)
        const finalSaldo = Math.max(saldo, 0);
        await prisma.cuentaFinanciera.update({
            where: { id: parseInt(cuentaId) },
            data: { saldoActual: finalSaldo }
        });
    }

    // 5. Show final state
    const cuentasAfter = await prisma.cuentaFinanciera.findMany();
    console.log('\n=== CUENTAS DESPUES ===');
    cuentasAfter.forEach(c => console.log(`  ${c.nombre} (${c.tipo}): $${c.saldoActual.toLocaleString()}`));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
