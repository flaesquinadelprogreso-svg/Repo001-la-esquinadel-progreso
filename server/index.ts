import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app: Express = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await prisma.cliente.findMany({
            include: { _count: { select: { cuentasPorCobrar: true, ventas: true } } }
        });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});

app.get('/api/clientes/:id', async (req, res) => {
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                cuentasPorCobrar: true,
                ventas: { take: 10, orderBy: { createdAt: 'desc' } }
            }
        });
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const cliente = await prisma.cliente.create({
            data: {
                nombre: req.body.nombre,
                documento: req.body.documento,
                telefono: req.body.telefono || null,
                email: req.body.email || null,
                tipo: req.body.tipo || 'Regular',
                direccion: req.body.direccion || null
            }
        });
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    try {
        const cliente = await prisma.cliente.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        await prisma.cliente.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar cliente' });
    }
});

// ═══════════════════════════════════════════════════════════════
// PROVEEDORES
// ═══════════════════════════════════════════════════════════════

app.get('/proveedores', async (req, res) => {
    const proveedores = await prisma.proveedor.findMany({ include: { compras: true } });
    res.json(proveedores);
});

app.post('/proveedores', async (req, res) => {
    const proveedor = await prisma.proveedor.create({ data: req.body });
    res.json(proveedor);
});

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════════

app.get('/productos', async (req, res) => {
    try {
        const queryParams: any = {
            where: { activo: true },
            orderBy: { createdAt: 'desc' }
        };

        if (req.query.q) {
            const search = String(req.query.q).trim();
            queryParams.where.OR = [
                { nombre: { contains: search } },
                { codigo: { contains: search } }
            ];
        }

        if (req.query.page) {
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 30;
            const skip = (page - 1) * limit;

            queryParams.take = limit;
            queryParams.skip = skip;

            const [productos, total] = await Promise.all([
                prisma.producto.findMany(queryParams),
                prisma.producto.count({ where: queryParams.where })
            ]);

            return res.json({
                data: productos,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } else {
            if (req.query.limit) {
                queryParams.take = parseInt(String(req.query.limit)) || 30;
            }
            const productos = await prisma.producto.findMany(queryParams);
            res.json(productos);
        }
    } catch (error) {
        console.error('Error fetching productos:', error);
        res.status(500).json({ error: 'Error obteniendo productos' });
    }
});

app.post('/productos', async (req, res) => {
    const producto = await prisma.producto.create({ data: req.body });
    res.json(producto);
});

// ═══════════════════════════════════════════════════════════════
// VENTAS
// ═══════════════════════════════════════════════════════════════

app.get('/ventas', async (req, res) => {
    const ventas = await prisma.venta.findMany({ include: { items: true, cliente: true } });
    res.json(ventas);
});

app.post('/ventas', async (req, res) => {
    const venta = await prisma.venta.create({ data: req.body });
    res.json(venta);
});

// ═══════════════════════════════════════════════════════════════
// CUENTAS POR COBRAR
// ═══════════════════════════════════════════════════════════════

app.get('/cuentas-cobrar', async (req, res) => {
    const cuentas = await prisma.cuentaPorCobrar.findMany({ include: { cliente: true } });
    res.json(cuentas);
});

app.post('/cuentas-cobrar', async (req, res) => {
    const cuenta = await prisma.cuentaPorCobrar.create({ data: req.body });
    res.json(cuenta);
});

// ═══════════════════════════════════════════════════════════════
// CUENTAS POR PAGAR
// ═══════════════════════════════════════════════════════════════

app.get('/cuentas-pagar', async (req, res) => {
    const cuentas = await prisma.cuentaPorPagar.findMany({ include: { proveedor: true } });
    res.json(cuentas);
});

app.post('/cuentas-pagar', async (req, res) => {
    const cuenta = await prisma.cuentaPorPagar.create({ data: req.body });
    res.json(cuenta);
});

// ═══════════════════════════════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════════════════════════════

app.get('/usuarios', async (req, res) => {
    const usuarios = await prisma.usuario.findMany();
    res.json(usuarios);
});

app.post('/usuarios', async (req, res) => {
    const usuario = await prisma.usuario.create({ data: req.body });
    res.json(usuario);
});

// ═══════════════════════════════════════════════════════════════
// HISTORIAL DE COMPRAS DEL CLIENTE
// ═══════════════════════════════════════════════════════════════

// Obtener historial de compras de un cliente
app.get('/api/clientes/:id/ventas', async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);

        const ventas = await prisma.venta.findMany({
            where: {
                clienteId,
                estado: 'completada'
            },
            include: {
                items: {
                    include: {
                        producto: true,
                        servicio: true,
                        ubicacion: true
                    }
                },
                devoluciones: {
                    include: {
                        items: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Calcular cantidades devueltas por cada item
        const ventasConDevoluciones = ventas.map(venta => {
            const itemsConDevolucion = venta.items.map(item => {
                const cantidadDevuelta = venta.devoluciones.reduce((total, dev) => {
                    const itemDev = dev.items.find(i => i.itemVentaId === item.id);
                    return total + (itemDev ? itemDev.cantidad : 0);
                }, 0);

                return {
                    ...item,
                    cantidadDevuelta,
                    cantidadDisponible: item.cantidad - cantidadDevuelta
                };
            });

            return {
                ...venta,
                items: itemsConDevolucion,
                totalDevuelto: venta.devoluciones.reduce((sum, d) => sum + d.total, 0)
            };
        });

        res.json(ventasConDevoluciones);
    } catch (error) {
        console.error('Error al obtener historial de compras:', error);
        res.status(500).json({ error: 'Error al obtener historial de compras' });
    }
});

// ═══════════════════════════════════════════════════════════════
// DEVOLUCIONES / RETORNOS
// ═══════════════════════════════════════════════════════════════

// Obtener todas las devoluciones
app.get('/api/devoluciones', async (req, res) => {
    try {
        const devoluciones = await prisma.devolucion.findMany({
            include: {
                venta: {
                    include: { cliente: true }
                },
                cliente: true,
                items: {
                    include: { producto: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(devoluciones);
    } catch (error) {
        console.error('Error al obtener devoluciones:', error);
        res.status(500).json({ error: 'Error al obtener devoluciones' });
    }
});

// Obtener una devolución por ID
app.get('/api/devoluciones/:id', async (req, res) => {
    try {
        const devolucion = await prisma.devolucion.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                venta: {
                    include: {
                        cliente: true,
                        items: { include: { producto: true, servicio: true } }
                    }
                },
                cliente: true,
                items: {
                    include: { producto: true }
                }
            }
        });

        if (!devolucion) {
            return res.status(404).json({ error: 'Devolución no encontrada' });
        }

        res.json(devolucion);
    } catch (error) {
        console.error('Error al obtener devolución:', error);
        res.status(500).json({ error: 'Error al obtener devolución' });
    }
});

// Procesar una devolución (parcial o total)
app.post('/api/devoluciones', async (req, res) => {
    try {
        const { ventaId, items, motivo, metodoReembolso, cuentaId } = req.body;

        // Obtener la venta original con sus items
        const venta = await prisma.venta.findUnique({
            where: { id: ventaId },
            include: {
                items: {
                    include: { producto: true }
                },
                devoluciones: {
                    include: { items: true }
                }
            }
        });

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        if (venta.estado === 'anulada') {
            return res.status(400).json({ error: 'No se puede devolver una venta anulada' });
        }

        // Calcular cantidades ya devueltas por item
        const cantidadesDevueltas: Record<number, number> = {};
        venta.devoluciones.forEach(dev => {
            dev.items.forEach(item => {
                cantidadesDevueltas[item.itemVentaId] = (cantidadesDevueltas[item.itemVentaId] || 0) + item.cantidad;
            });
        });

        // Validar que los items a devolver no excedan las cantidades disponibles
        for (const itemReq of items) {
            const itemVenta = venta.items.find(i => i.id === itemReq.itemVentaId);
            if (!itemVenta) {
                return res.status(400).json({ error: `Item ${itemReq.itemVentaId} no encontrado en la venta` });
            }

            const yaDevuelto = cantidadesDevueltas[itemReq.itemVentaId] || 0;
            const disponible = itemVenta.cantidad - yaDevuelto;

            if (itemReq.cantidad > disponible) {
                return res.status(400).json({
                    error: `Cantidad a devolver (${itemReq.cantidad}) excede la disponible (${disponible}) para el item ${itemVenta.nombre}`
                });
            }
        }

        // Calcular totales de la devolución
        let subtotal = 0;
        const itemsDevolucion = items.map((itemReq: { itemVentaId: number; cantidad: number }) => {
            const itemVenta = venta.items.find(i => i.id === itemReq.itemVentaId)!;
            const subtotalItem = itemReq.cantidad * itemVenta.precioUnit;
            subtotal += subtotalItem;

            return {
                itemVentaId: itemReq.itemVentaId,
                productoId: itemVenta.productoId,
                nombre: itemVenta.nombre,
                codigo: itemVenta.codigo,
                cantidad: itemReq.cantidad,
                precioUnit: itemVenta.precioUnit,
                subtotal: subtotalItem,
                esServicio: itemVenta.esServicio
            };
        });

        // Calcular IVA proporcional
        const ivaTasa = venta.ivaTasa || 0;
        const iva = Math.round(subtotal * ivaTasa / 100);
        const total = subtotal + iva;

        // Determinar si es devolución total o parcial
        const tipo = items.length === venta.items.length &&
            items.every((itemReq: { itemVentaId: number; cantidad: number }) => {
                const itemVenta = venta.items.find(i => i.id === itemReq.itemVentaId)!;
                const yaDevuelto = cantidadesDevueltas[itemReq.itemVentaId] || 0;
                return itemReq.cantidad === itemVenta.cantidad - yaDevuelto;
            }) ? 'total' : 'parcial';

        // Generar número de devolución
        const ultimaDevolucion = await prisma.devolucion.findFirst({
            orderBy: { id: 'desc' }
        });
        const numeroDevolucion = `DEV-${String((ultimaDevolucion?.id || 0) + 1).padStart(6, '0')}`;

        // Crear la devolución y restaurar inventario en una transacción
        const resultado = await prisma.$transaction(async (tx) => {
            // Crear la devolución
            const devolucion = await tx.devolucion.create({
                data: {
                    ventaId,
                    clienteId: venta.clienteId,
                    numeroDevolucion,
                    tipo,
                    motivo,
                    subtotal,
                    iva,
                    total,
                    metodoReembolso,
                    items: {
                        create: itemsDevolucion
                    }
                },
                include: {
                    items: true
                }
            });

            // Restaurar stock de productos (no servicios)
            for (const item of itemsDevolucion) {
                if (!item.esServicio && item.productoId) {
                    const itemVenta = venta.items.find(i => i.id === item.itemVentaId);

                    if (itemVenta?.locationId) {
                        // Restaurar stock en la ubicación original
                        const stockActual = await tx.stockUbicacion.findUnique({
                            where: {
                                productoId_ubicacionId: {
                                    productoId: item.productoId,
                                    ubicacionId: itemVenta.locationId
                                }
                            }
                        });

                        if (stockActual) {
                            await tx.stockUbicacion.update({
                                where: {
                                    productoId_ubicacionId: {
                                        productoId: item.productoId,
                                        ubicacionId: itemVenta.locationId
                                    }
                                },
                                data: {
                                    stock: stockActual.stock + item.cantidad
                                }
                            });
                        } else {
                            // Crear registro de stock si no existe
                            await tx.stockUbicacion.create({
                                data: {
                                    productoId: item.productoId,
                                    ubicacionId: itemVenta.locationId,
                                    stock: item.cantidad
                                }
                            });
                        }
                    }
                }
            }

            // Registrar movimiento de caja si hay reembolso
            if (metodoReembolso !== 'credito' && cuentaId) {
                const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

                await tx.movimientoCajaDevolucion.create({
                    data: {
                        tipo: 'salida',
                        categoria: 'Devolución',
                        monto: total,
                        metodo: metodoReembolso === 'efectivo' ? 'efectivo' : 'banco',
                        referencia: numeroDevolucion,
                        descripcion: `Devolución ${tipo} - Recibo: ${venta.numeroRecibo}`,
                        hora,
                        cuentaId,
                        devolucionId: devolucion.id
                    }
                });

                // Actualizar saldo de la cuenta financiera
                await tx.cuentaFinanciera.update({
                    where: { id: cuentaId },
                    data: {
                        saldoActual: {
                            decrement: total
                        }
                    }
                });
            }

            // Si es reembolso en crédito, actualizar o crear cuenta por cobrar
            if (metodoReembolso === 'credito' && venta.clienteId) {
                const cuentaExistente = await tx.cuentaPorCobrar.findFirst({
                    where: {
                        clienteId: venta.clienteId,
                        numeroRecibo: venta.numeroRecibo
                    }
                });

                if (cuentaExistente) {
                    // Reducir el monto de la cuenta por cobrar
                    await tx.cuentaPorCobrar.update({
                        where: { id: cuentaExistente.id },
                        data: {
                            monto: { decrement: total }
                        }
                    });
                }
            }

            return devolucion;
        });

        res.json(resultado);
    } catch (error) {
        console.error('Error al procesar devolución:', error);
        res.status(500).json({ error: 'Error al procesar devolución' });
    }
});

// Anular una devolución
app.post('/api/devoluciones/:id/anular', async (req, res) => {
    try {
        const devolucionId = parseInt(req.params.id);

        const devolucion = await prisma.devolucion.findUnique({
            where: { id: devolucionId },
            include: {
                items: true,
                venta: {
                    include: { items: true }
                }
            }
        });

        if (!devolucion) {
            return res.status(404).json({ error: 'Devolución no encontrada' });
        }

        if (devolucion.estado === 'anulada') {
            return res.status(400).json({ error: 'La devolución ya está anulada' });
        }

        // Anular la devolución y revertir cambios de inventario
        const resultado = await prisma.$transaction(async (tx) => {
            // Actualizar estado de la devolución
            const devolucionActualizada = await tx.devolucion.update({
                where: { id: devolucionId },
                data: { estado: 'anulada' }
            });

            // Revertir stock de productos
            for (const item of devolucion.items) {
                if (!item.esServicio && item.productoId) {
                    const itemVenta = devolucion.venta.items.find(i => i.id === item.itemVentaId);

                    if (itemVenta?.locationId) {
                        const stockActual = await tx.stockUbicacion.findUnique({
                            where: {
                                productoId_ubicacionId: {
                                    productoId: item.productoId!,
                                    ubicacionId: itemVenta.locationId
                                }
                            }
                        });

                        if (stockActual) {
                            await tx.stockUbicacion.update({
                                where: {
                                    productoId_ubicacionId: {
                                        productoId: item.productoId!,
                                        ubicacionId: itemVenta.locationId
                                    }
                                },
                                data: {
                                    stock: Math.max(0, stockActual.stock - item.cantidad)
                                }
                            });
                        }
                    }
                }
            }

            // Eliminar movimiento de caja si existe
            const movimiento = await tx.movimientoCajaDevolucion.findUnique({
                where: { devolucionId }
            });

            if (movimiento) {
                // Restaurar saldo de la cuenta
                if (movimiento.cuentaId) {
                    await tx.cuentaFinanciera.update({
                        where: { id: movimiento.cuentaId },
                        data: {
                            saldoActual: {
                                increment: movimiento.monto
                            }
                        }
                    });
                }

                await tx.movimientoCajaDevolucion.delete({
                    where: { devolucionId }
                });
            }

            return devolucionActualizada;
        });

        res.json(resultado);
    } catch (error) {
        console.error('Error al anular devolución:', error);
        res.status(500).json({ error: 'Error al anular devolución' });
    }
});

app.listen(3001, () => {
    console.log('API Server running on port 3001');
});
