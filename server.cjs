require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;
const path = require('path');

// Helpers para formato en descripciones (Backend)
const formatPesos = (valor) => {
    const rounded = Math.round(Number(valor) || 0);
    return '$' + rounded.toLocaleString('es-CO');
};
const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO');
};

// Configuración de Winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

if (!process.env.JWT_SECRET) {
    logger.error('CRITICAL: JWT_SECRET no está definido en el archivo .env');
    throw new Error('JWT_SECRET no está definido. Verifica tu .env');
}

// Middleware de autenticación global
const verifyToken = (req, res, next) => {
    // Si la ruta es pública (relativa a /api), omitir verificación
    const publicPaths = ['/login', '/health'];
    if (publicPaths.includes(req.path) || req.path.startsWith('/whatsapp')) {
        return next();
    }

    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'No se proveyó un token' });
    const token = header.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.user = decoded;
        next();
    });
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE WHATSAPP
// ═══════════════════════════════════════════════════════════════
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');

let whatsappQr = null;
let whatsappStatus = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, QR_READY, CONNECTED

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', (qr) => {
    whatsappQr = qr;
    whatsappStatus = 'QR_READY';
    logger.info('✅ QR de WhatsApp generado. Escanea para conectar.');
    qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
    whatsappStatus = 'CONNECTED';
    whatsappQr = null;
    logger.info('🚀 WhatsApp listo para enviar mensajes');
});

client.on('authenticated', () => {
    logger.info('✅ WhatsApp autenticado correctamente');
});

client.on('auth_failure', (msg) => {
    whatsappStatus = 'DISCONNECTED';
    logger.error('❌ Error de autenticación en WhatsApp:', msg);
});

client.on('disconnected', (reason) => {
    whatsappStatus = 'DISCONNECTED';
    logger.info('❌ WhatsApp desconectado:', reason);
});

// CORS: Siempre debe ir ANTES del Rate Limit para no perder encabezados al rechazar conexiones excesivas
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://tu-dominio.com'] : ['http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Rate Limit
// Ajustado a 500 requests por 5 minutos para soportar la concurrencia de llamadas en React
const limiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 500 });
// Aplicar solo a rutas de API para no penalizar assets estáticos
app.use('/api', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas públicas base
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Excluir WhatsApp temporalmente debido al polling continuo desde la UI sin tokens
// Opcional: puedes envolver tu middleware global si es necesario excluir ciertos prefijos.
app.use('/api/whatsapp', (req, res, next) => next());

// Protegiendo toda la API por defecto (Deny-by-default) salvo excepciones pre-programadas
app.use('/api', verifyToken);

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE RUTAS PÚBLICAS Y AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Buscar el usuario en la base de datos
        const user = await prisma.usuario.findUnique({
            where: { username }
        });

        if (user && user.activo && await bcrypt.compare(password, user.password)) {
            // Firma y emisión de un JWT de 12 horas
            const token = jwt.sign(
                { id: user.id, role: user.role, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: '12h' }
            );
            res.json({
                success: true,
                token,
                user: { username: user.username, role: user.role }
            });
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (error) {
        logger.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint que permite al Frontend re-validar la sesión "on-load" si el admin refresca la página
app.get('/api/auth/me', (req, res) => {
    // Si la request llega aquí, es porque `verifyToken` ya confió en el usuario: req.user existe
    res.json({ user: req.user });
});

// ═══════════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await prisma.cliente.findMany({
            orderBy: { createdAt: 'desc' }
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

app.get('/api/proveedores', async (req, res) => {
    try {
        const proveedores = await prisma.proveedor.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(proveedores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener proveedores' });
    }
});

app.post('/api/proveedores', async (req, res) => {
    try {
        const proveedor = await prisma.proveedor.create({ data: req.body });
        res.json(proveedor);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear proveedor' });
    }
});

app.put('/api/proveedores/:id', async (req, res) => {
    try {
        const proveedor = await prisma.proveedor.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(proveedor);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar proveedor' });
    }
});

app.delete('/api/proveedores/:id', async (req, res) => {
    try {
        await prisma.proveedor.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar proveedor' });
    }
});

// ═══════════════════════════════════════════════════════════════
// UBICACIONES
// ═══════════════════════════════════════════════════════════════

app.get('/api/ubicaciones', async (req, res) => {
    try {
        const ubicaciones = await prisma.ubicacion.findMany();
        res.json(ubicaciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ubicaciones' });
    }
});

app.post('/api/ubicaciones', async (req, res) => {
    try {
        const ubicacion = await prisma.ubicacion.create({ data: { nombre: req.body.nombre } });
        res.json(ubicacion);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear ubicación' });
    }
});

app.put('/api/ubicaciones/:id', async (req, res) => {
    try {
        const ubicacion = await prisma.ubicacion.update({
            where: { id: parseInt(req.params.id) },
            data: { nombre: req.body.nombre }
        });
        res.json(ubicacion);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar ubicación' });
    }
});

app.delete('/api/ubicaciones/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const stockCount = await prisma.stockUbicacion.count({
            where: { ubicacionId: id, stock: { gt: 0 } }
        });
        if (stockCount > 0) {
            return res.status(400).json({ error: 'No se puede eliminar la ubicación porque tiene productos con stock' });
        }
        await prisma.ubicacion.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar ubicación: ' + error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════════

app.get('/api/productos', async (req, res) => {
    try {
        const queryParams = {
            include: { stockUbicaciones: { include: { ubicacion: true } } },
            orderBy: { createdAt: 'desc' },
            where: { activo: true }
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
            const limit = parseInt(String(req.query.limit)) || 50;
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
                queryParams.take = parseInt(String(req.query.limit)) || 50;
            }
            const productos = await prisma.producto.findMany(queryParams);
            res.json(productos);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { stockUbicaciones, ...data } = req.body;
        const producto = await prisma.producto.create({
            data: {
                ...data,
                precio: parseInt(data.precio),
                costo: data.costo ? parseInt(data.costo) : 0,
                stockMinimo: data.stockMinimo ? parseInt(data.stockMinimo) : 5,
                precioMayor: data.precioMayor ? parseInt(data.precioMayor) : null,
                stockUbicaciones: stockUbicaciones ? {
                    create: stockUbicaciones.map(s => ({
                        ubicacionId: s.ubicacionId,
                        stock: s.stock
                    }))
                } : undefined
            },
            include: { stockUbicaciones: true }
        });
        res.json(producto);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear producto: ' + error.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { stockUbicaciones, ...data } = req.body;
        const producto = await prisma.producto.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...data,
                precio: data.precio !== undefined ? parseInt(data.precio) : undefined,
                costo: data.costo !== undefined ? parseInt(data.costo) : undefined,
                stockMinimo: data.stockMinimo !== undefined ? parseInt(data.stockMinimo) : undefined,
                precioMayor: data.precioMayor !== undefined ? (data.precioMayor === null || data.precioMayor === '' ? null : parseInt(data.precioMayor)) : undefined
            }
        });
        if (stockUbicaciones) {
            for (const sl of stockUbicaciones) {
                await prisma.stockUbicacion.upsert({
                    where: { productoId_ubicacionId: { productoId: producto.id, ubicacionId: sl.ubicacionId } },
                    update: { stock: sl.stock },
                    create: { productoId: producto.id, ubicacionId: sl.ubicacionId, stock: sl.stock }
                });
            }
        }
        res.json(producto);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar producto: ' + error.message });
    }
});

app.post('/api/inventario/importar', async (req, res) => {
    try {
        const { productos } = req.body;
        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ error: 'Formato de datos inválido o archivo vacío' });
        }

        // Obtener la ubicación principal por defecto (o crearla si no existe)
        // Usualmente llamada "Principal"
        let ubicacionDefecto = await prisma.ubicacion.findFirst({
            where: {
                nombre: {
                    contains: 'principal', // Ignorar mayúsculas depende del motor, mejor fallback
                }
            }
        });

        if (!ubicacionDefecto) {
            ubicacionDefecto = await prisma.ubicacion.findFirst(); // Tomar cualquiera
        }

        if (!ubicacionDefecto) {
            ubicacionDefecto = await prisma.ubicacion.create({ data: { nombre: 'Sede Principal' } });
        }

        logger.info(`Iniciando importación masiva de ${productos.length} productos hacia ${ubicacionDefecto.nombre}`);

        let insertados = 0;
        let actualizados = 0;
        let errores = 0;

        for (const p of productos) {
            try {
                if (!p.codigo || !p.nombre || p.precio === undefined || p.stock === undefined) {
                    logger.warn(`Producto saltado por campos incompletos: ${JSON.stringify(p)}`);
                    errores++;
                    continue;
                }

                // Normalizar valores (centavos)
                const precio = parseInt(p.precio) || 0;
                const costo = p.costo ? parseInt(p.costo) : 0;
                const stock = parseInt(p.stock) || 0;
                const stockMinimo = p.stockMinimo !== undefined ? parseInt(p.stockMinimo) : 5;

                // Transacción individual por producto para que un error no falle todo el lote
                await prisma.$transaction(async (tx) => {
                    let productoDB = await tx.producto.findUnique({ where: { codigo: String(p.codigo) } });

                    if (productoDB) {
                        // Actualizar
                        productoDB = await tx.producto.update({
                            where: { id: productoDB.id },
                            data: {
                                nombre: String(p.nombre),
                                precio: precio,
                                costo: costo,
                                stockMinimo: stockMinimo,
                                categoria: p.categoria ? String(p.categoria) : productoDB.categoria
                            }
                        });

                        // Actualizar Stock sumando al existente o seteando el del Excel?
                        // El excel dice "Stock real", así que sobreescribimos.
                        await tx.stockUbicacion.upsert({
                            where: { productoId_ubicacionId: { productoId: productoDB.id, ubicacionId: ubicacionDefecto.id } },
                            update: { stock: stock },
                            create: { productoId: productoDB.id, ubicacionId: ubicacionDefecto.id, stock: stock }
                        });
                        actualizados++;
                    } else {
                        // Crear
                        productoDB = await tx.producto.create({
                            data: {
                                codigo: String(p.codigo),
                                nombre: String(p.nombre),
                                precio: precio,
                                costo: costo,
                                categoria: p.categoria ? String(p.categoria) : null,
                                stockMinimo: stockMinimo
                            }
                        });

                        await tx.stockUbicacion.create({
                            data: {
                                productoId: productoDB.id,
                                ubicacionId: ubicacionDefecto.id,
                                stock: stock
                            }
                        });
                        insertados++;
                    }
                });
            } catch (err) {
                logger.error(`Error procesando SKU ${p.codigo}: ${err.message}`);
                errores++;
            }
        }

        res.json({ success: true, insertados, actualizados, errores });
    } catch (error) {
        logger.error('Error general en importación masiva:', error);
        res.status(500).json({ error: 'Error del servidor al procesar el Excel' });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await prisma.producto.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

app.post('/api/productos/:id/transferir', async (req, res) => {
    try {
        const { origenUbicacionId, destinoUbicacionId, cantidad } = req.body;
        const productoId = parseInt(req.params.id);
        if (origenUbicacionId === destinoUbicacionId) {
            return res.status(400).json({ error: 'Las ubicaciones de origen y destino deben ser diferentes' });
        }
        const origenRecord = await prisma.stockUbicacion.findUnique({
            where: { productoId_ubicacionId: { productoId, ubicacionId: parseInt(origenUbicacionId) } }
        });
        if (!origenRecord || origenRecord.stock < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente en la ubicación de origen' });
        }
        await prisma.$transaction([
            prisma.stockUbicacion.update({
                where: { id: origenRecord.id },
                data: { stock: { decrement: cantidad } }
            }),
            prisma.stockUbicacion.upsert({
                where: { productoId_ubicacionId: { productoId, ubicacionId: parseInt(destinoUbicacionId) } },
                update: { stock: { increment: cantidad } },
                create: { productoId, ubicacionId: parseInt(destinoUbicacionId), stock: cantidad }
            })
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la transferencia' });
    }
});

// ═══════════════════════════════════════════════════════════════
// SERVICIOS
// ═══════════════════════════════════════════════════════════════

app.get('/api/servicios', async (req, res) => {
    try {
        const servicios = await prisma.servicio.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});

app.post('/api/servicios', async (req, res) => {
    try {
        const servicio = await prisma.servicio.create({
            data: { ...req.body, precio: parseInt(req.body.precio) }
        });
        res.json(servicio);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear servicio' });
    }
});

app.put('/api/servicios/:id', async (req, res) => {
    try {
        const servicio = await prisma.servicio.update({
            where: { id: parseInt(req.params.id) },
            data: { ...req.body, precio: req.body.precio !== undefined ? parseInt(req.body.precio) : undefined }
        });
        res.json(servicio);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar servicio' });
    }
});

app.delete('/api/servicios/:id', async (req, res) => {
    try {
        await prisma.servicio.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar servicio' });
    }
});

// ═══════════════════════════════════════════════════════════════
// VENTAS POS (Refactored for Atomicity and Security)
// ═══════════════════════════════════════════════════════════════

app.get('/api/ventas', async (req, res) => {
    try {
        const ventas = await prisma.venta.findMany({
            include: {
                items: true,
                cliente: true,
                pagos: true,
                devoluciones: {
                    include: { items: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const result = ventas.map(v => ({
            ...v,
            totalDevuelto: v.devoluciones?.reduce((acc, d) => acc + (d.total || 0), 0) || 0
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

app.get('/api/ventas/historial', async (req, res) => {
    try {
        const ventas = await prisma.venta.findMany({
            include: {
                items: true,
                cliente: true,
                pagos: true,
                devoluciones: {
                    include: { items: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Opcional: limitar para rendimiento
        });

        const result = ventas.map(v => ({
            ...v,
            totalDevuelto: v.devoluciones?.reduce((acc, d) => acc + (d.total || 0), 0) || 0
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { clienteId, items, metodoPago, cuentaId, fechaVencimiento, pagos, ivaTasa: reqIvaTasa } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'La venta debe tener items' });

        logger.info('--- NUEVA VENTA RECIBIDA ---', { itemsCount: items?.length });
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Obtener Configuración e IVA (Mover aquí para evitar ReferenceError)
            const config = await tx.configuracion.findFirst();
            const ivaTasa = reqIvaTasa || config?.ivaDefecto || 19;

            const productIds = items.filter(i => i.productoId).map(i => i.productoId);
            const serviceIds = items.filter(i => i.servicioId).map(i => i.servicioId);
            const [dbProducts, dbServices] = await Promise.all([
                tx.producto.findMany({ where: { id: { in: productIds } } }),
                tx.servicio.findMany({ where: { id: { in: serviceIds } } })
            ]);
            const productsMap = new Map(dbProducts.map(p => [p.id, p]));
            const servicesMap = new Map(dbServices.map(s => [s.id, s]));

            let totalVentaCalculado = 0;
            let subtotalCalculado = 0;
            let totalCostoVenta = 0;

            const finalItemsList = items.map(item => {
                let precioUnit = 0;
                let costoUnit = 0;
                if (item.productoId) {
                    const p = productsMap.get(item.productoId);
                    if (!p) throw new Error(`Producto ${item.productoId} no encontrado`);
                    // Respect price override from frontend if present
                    precioUnit = item.precioUnit != null ? parseInt(item.precioUnit) : p.precio;
                    costoUnit = p.costo || 0;
                } else if (item.servicioId) {
                    const s = servicesMap.get(item.servicioId);
                    if (!s) throw new Error(`Servicio ${item.servicioId} no encontrado`);
                    // Respect price override from frontend if present
                    precioUnit = item.precioUnit != null ? parseInt(item.precioUnit) : s.precio;
                    costoUnit = 0;
                }
                const itemTotal = precioUnit * item.cantidad;
                const itemCostoTotal = costoUnit * item.cantidad;
                const itemSubtotal = Math.round(itemTotal / (1 + (ivaTasa / 100)));
                totalVentaCalculado += itemTotal;
                subtotalCalculado += itemSubtotal;
                totalCostoVenta += itemCostoTotal;

                return {
                    productoId: item.productoId,
                    servicioId: item.servicioId,
                    nombre: item.nombre,
                    codigo: item.codigo,
                    cantidad: item.cantidad,
                    precioUnit: precioUnit,
                    subtotal: itemTotal,
                    valor_compra_total: itemCostoTotal,
                    valor_venta_total: itemTotal,
                    ganancia: itemTotal - itemCostoTotal,
                    locationId: item.locationId,
                    esServicio: !!item.servicioId
                };
            });

            // Calcular IVA
            const ivaCalculado = totalVentaCalculado - subtotalCalculado;

            // 2. Obtener Resolución Activa para numeración legal
            const resolucion = await tx.resolucion.findFirst({
                where: { activo: true }
            });

            let numeroRecibo;
            const now = new Date();
            const yy = now.getFullYear().toString().slice(-2);
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dateSuffix = `D${dd}MS${mm}`;

            if (resolucion) {
                const num = resolucion.actual + 1;
                if (num > resolucion.hasta) throw new Error('Resolución de facturación agotada');

                const prefix = resolucion.prefijo || 'FCT';
                numeroRecibo = `${prefix}-${yy}${dateSuffix}-${String(num).padStart(3, '0')}`;

                // Actualizar resolución
                await tx.resolucion.update({
                    where: { id: resolucion.id },
                    data: { actual: num }
                });
            } else {
                // Fallback robusto con formato FCT-[YY]D[DD]MS[MM]-[CONSECUTIVE]
                const prefixFallback = `FCT-${yy}${dateSuffix}-`;

                const lastVenta = await tx.venta.findFirst({
                    where: { numeroRecibo: { startsWith: prefixFallback } },
                    orderBy: { id: 'desc' }
                });

                let nextSeq = 1;
                if (lastVenta) {
                    const parts = lastVenta.numeroRecibo.split('-');
                    const n = parseInt(parts[parts.length - 1]);
                    if (!isNaN(n)) nextSeq = n + 1;
                }
                numeroRecibo = `${prefixFallback}${String(nextSeq).padStart(3, '0')}`;
            }

            const venta = await tx.venta.create({
                data: {
                    numeroRecibo,
                    clienteId: clienteId || null,
                    subtotal: subtotalCalculado,
                    iva: ivaCalculado,
                    ivaTasa: ivaTasa,
                    total: totalVentaCalculado,
                    metodoPago: metodoPago,
                    estado: 'completada',
                    items: { create: finalItemsList }
                }
            });

            for (const item of finalItemsList) {
                if (item.productoId && item.locationId) {
                    const stockRecord = await tx.stockUbicacion.findUnique({
                        where: { productoId_ubicacionId: { productoId: item.productoId, ubicacionId: item.locationId } }
                    });
                    if (!stockRecord || stockRecord.stock < item.cantidad) {
                        throw new Error(`Stock insuficiente para ${item.nombre} en la ubicación seleccionada`);
                    }
                    await tx.stockUbicacion.update({
                        where: { id: stockRecord.id },
                        data: { stock: { decrement: item.cantidad } }
                    });
                }
            }

            const finalPayments = metodoPago === 'multiple' ? pagos : [{ metodo: metodoPago, monto: totalVentaCalculado, cuentaId: cuentaId }];
            for (const p of finalPayments) {
                if (p.metodo === 'credito') {
                    if (!clienteId) throw new Error('Cliente requerido para venta a crédito');

                    const cuentasCliente = await tx.cuentaPorCobrar.findMany({
                        where: { clienteId: clienteId },
                        orderBy: { fechaCreacion: 'asc' }
                    });
                    const cuentaAbierta = cuentasCliente.find(c => (c.monto - (c.abonado || 0)) > 0);
                    const descDetalle = `Recibo ${numeroRecibo} - ${formatFecha(new Date())} - ${formatPesos(p.monto)}`;

                    if (cuentaAbierta) {
                        await tx.cuentaPorCobrar.update({
                            where: { id: cuentaAbierta.id },
                            data: {
                                monto: { increment: p.monto },
                                descripcion: `${cuentaAbierta.descripcion} | ${descDetalle}`,
                                estado: 'pendiente'
                            }
                        });
                    } else {
                        await tx.cuentaPorCobrar.create({
                            data: {
                                clienteId: clienteId,
                                descripcion: descDetalle,
                                monto: p.monto,
                                fechaVencimiento: fechaVencimiento || new Date().toISOString().split('T')[0],
                                numeroRecibo: numeroRecibo,
                                estado: 'pendiente'
                            }
                        });
                    }
                } else {
                    const targetCuentaId = parseInt(p.cuentaId);
                    if (!targetCuentaId) throw new Error(`Cuenta no especificada para pago en ${p.metodo}`);
                    await tx.pagoVenta.create({
                        data: { ventaId: venta.id, monto: p.monto, metodo: p.metodo }
                    });
                    await tx.movimientoCaja.create({
                        data: {
                            tipo: 'entrada',
                            categoria: 'Venta POS',
                            monto: p.monto,
                            metodo: p.metodo,
                            referencia: numeroRecibo,
                            fecha: new Date(),
                            hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
                            ventaId: venta.id,
                            cuentaId: targetCuentaId
                        }
                    });
                    await tx.cuentaFinanciera.update({
                        where: { id: targetCuentaId },
                        data: { saldoActual: { increment: p.monto } }
                    });
                }
            }
            return venta;
        });
        res.json(resultado);
    } catch (error) {
        logger.error('Error en creación de venta:', error);
        res.status(500).json({ error: error.message || 'Error interno al procesar la venta' });
    }
});

// ═══════════════════════════════════════════════════════════════
// DEVOLUCIONES (Nuevo flujo: Crea Venta con tipo=DEVOLUCION y valores negativos)
// ═══════════════════════════════════════════════════════════════

// Endpoint para obtener devoluciones (ventas con tipo DEVOLUCION)
app.get('/api/devoluciones-venta', async (req, res) => {
    try {
        const devoluciones = await prisma.venta.findMany({
            where: { tipo: 'DEVOLUCION' },
            include: {
                cliente: true,
                items: {
                    include: { producto: true }
                },
                ventaOriginal: {
                    include: { cliente: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(devoluciones);
    } catch (error) {
        logger.error('Error al obtener devoluciones:', error);
        res.status(500).json({ error: 'Error al obtener devoluciones' });
    }
});

// Endpoint para procesar devolución creando Venta negativa
app.post('/api/devoluciones-venta', async (req, res) => {
    try {
        const { ventaId, items, motivo, metodoReembolso, cuentaId, esDevolucionFisica } = req.body;

        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Obtener la venta original con sus items
            const ventaOriginal = await tx.venta.findUnique({
                where: { id: parseInt(ventaId) },
                include: {
                    items: {
                        include: { producto: true }
                    },
                    cliente: true
                }
            });

            if (!ventaOriginal) throw new Error('Venta no encontrada');
            if (ventaOriginal.tipo === 'DEVOLUCION') throw new Error('No se puede devolver una devolución');
            if (ventaOriginal.estado === 'anulada') throw new Error('No se puede devolver una venta anulada');

            // 2. Generar número de documento de devolución: DEV-{numeroFacturaOriginal sin prefijo}-{timestamp_o_random}
            const numeroSinPrefijo = ventaOriginal.numeroRecibo.replace(/^FCT-/, '');

            // Para permitir múltiples devoluciones parciales, le agregamos un sufijo único
            const suffix = Math.floor(1000 + Math.random() * 9000); // 4 digitos aleatorios
            const numeroDevolucion = `DEV-${numeroSinPrefijo}-${suffix}`;

            // 4. Calcular valores negativos para la devolución
            let subtotalDevuelto = 0;
            let ivaDevuelto = 0;
            let totalDevuelto = 0;
            let costoTotalDevuelto = 0;

            const itemsDevolucion = [];

            for (const reqItem of items) {
                const originalItem = ventaOriginal.items.find(i => i.id === reqItem.itemVentaId);
                if (!originalItem) {
                    throw new Error(`Item ${reqItem.itemVentaId} no encontrado en la venta original`);
                }

                // Validar cantidad disponible para devolver
                const cantidadMaximaDevolver = originalItem.cantidad - (originalItem.cantidadDevuelta || 0);
                if (reqItem.cantidad > cantidadMaximaDevolver) {
                    throw new Error(`Cantidad a devolver (${reqItem.cantidad}) excede la disponible (${cantidadMaximaDevolver}) para ${originalItem.nombre}`);
                }

                // Calcular valores en NEGATIVO
                const cantidadNegativa = -Math.abs(reqItem.cantidad);
                const precioUnit = originalItem.precioUnit;
                const costoUnit = originalItem.costo_unitario_ponderado || originalItem.producto?.costo || 0;

                // El precioUnit almacenado en la DB en Historial de Ventas YA es el precio neto con el que se vendió
                const subtotalItem = precioUnit * reqItem.cantidad;
                const costoItem = costoUnit * reqItem.cantidad;

                subtotalDevuelto += subtotalItem;
                costoTotalDevuelto += costoItem;

                // Item con valores NEGATIVOS
                itemsDevolucion.push({
                    productoId: originalItem.productoId,
                    servicioId: originalItem.servicioId,
                    nombre: originalItem.nombre,
                    codigo: originalItem.codigo,
                    cantidad: cantidadNegativa, // NEGATIVO
                    precioUnit: precioUnit,
                    subtotal: -subtotalItem, // NEGATIVO
                    esServicio: originalItem.esServicio,
                    locationId: originalItem.locationId,
                    // Valores históricos de rentabilidad en NEGATIVO
                    costo_unitario_ponderado: costoUnit,
                    valor_compra_total: -costoItem, // NEGATIVO
                    valor_venta_total: -subtotalItem, // NEGATIVO
                    ganancia: -(subtotalItem - costoItem) // NEGATIVO
                });

                // 5. Restaurar stock si es devolución física
                if (esDevolucionFisica && originalItem.productoId && !originalItem.esServicio && originalItem.locationId) {
                    await tx.stockUbicacion.update({
                        where: {
                            productoId_ubicacionId: {
                                productoId: originalItem.productoId,
                                ubicacionId: originalItem.locationId
                            }
                        },
                        data: { stock: { increment: reqItem.cantidad } }
                    });
                }

                // 6. Actualizar cantidad devuelta en el item original
                await tx.itemVenta.update({
                    where: { id: originalItem.id },
                    data: { cantidadDevuelta: { increment: reqItem.cantidad } }
                });
            }

            // IVA y total (valores negativos)
            // Como el precioUnit ya tiene el valor final, el subtotalDevuelto es el totalDevuelto.
            // Extraeremos el IVA solo para propósitos contables si es necesario.
            totalDevuelto = subtotalDevuelto;
            ivaDevuelto = Math.round(totalDevuelto - (totalDevuelto / (1 + (ventaOriginal.ivaTasa / 100))));
            const baseSubtotal = totalDevuelto - ivaDevuelto;

            // 7. Crear la Venta de devolución con todos los valores NEGATIVOS
            const ventaDevolucion = await tx.venta.create({
                data: {
                    numeroRecibo: numeroDevolucion,
                    clienteId: ventaOriginal.clienteId,
                    subtotal: -baseSubtotal, // NEGATIVO LA BASE
                    iva: -ivaDevuelto, // NEGATIVO
                    ivaTasa: ventaOriginal.ivaTasa,
                    total: -totalDevuelto, // NEGATIVO TOTAL EXACTO
                    metodoPago: metodoReembolso,
                    estado: 'completada',
                    tipo: 'DEVOLUCION',
                    referencia: ventaOriginal.numeroRecibo,
                    ventaOriginalId: ventaOriginal.id,
                    items: {
                        create: itemsDevolucion
                    }
                },
                include: {
                    items: true,
                    cliente: true
                }
            });

            // 8. Registrar movimiento de caja (salida por reembolso)
            if (metodoReembolso !== 'credito' && cuentaId) {
                const cuentaReembolso = await tx.cuentaFinanciera.findUnique({
                    where: { id: parseInt(cuentaId) }
                });

                if (!cuentaReembolso || cuentaReembolso.saldoActual < totalDevuelto) {
                    throw new Error(`Saldo insuficiente en el medio de pago seleccionado para el reembolso`);
                }

                await tx.movimientoCaja.create({
                    data: {
                        tipo: 'salida',
                        categoria: 'Devolución',
                        monto: totalDevuelto,
                        metodo: metodoReembolso === 'efectivo' ? 'efectivo' : 'banco',
                        referencia: numeroDevolucion,
                        descripcion: `Devolución - Ref: ${ventaOriginal.numeroRecibo}${motivo ? ` - ${motivo}` : ''}`,
                        cuentaId: parseInt(cuentaId),
                        ventaId: ventaDevolucion.id,
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    }
                });

                // Descontar saldo de la cuenta
                await tx.cuentaFinanciera.update({
                    where: { id: parseInt(cuentaId) },
                    data: { saldoActual: { decrement: totalDevuelto } }
                });
            } else if (metodoReembolso === 'credito' && ventaOriginal.clienteId) {
                // 9. Si es crédito, abonar a cuentas por cobrar existentes
                const cuentasCliente = await tx.cuentaPorCobrar.findMany({
                    where: { clienteId: ventaOriginal.clienteId, estado: 'pendiente' },
                    orderBy: { fechaCreacion: 'asc' }
                });

                let abonoPendiente = totalDevuelto;

                for (const cta of cuentasCliente) {
                    if (abonoPendiente <= 0) break;
                    const saldoRestante = cta.monto - (cta.abonado || 0);
                    if (saldoRestante <= 0) continue;

                    const montoAbonar = Math.min(saldoRestante, abonoPendiente);

                    await tx.abonoCobro.create({
                        data: {
                            cuentaPorCobrarId: cta.id,
                            monto: montoAbonar,
                            metodo: 'credito-devolucion',
                            fecha: new Date(),
                            hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                        }
                    });

                    const nuevoAbonado = (cta.abonado || 0) + montoAbonar;
                    await tx.cuentaPorCobrar.update({
                        where: { id: cta.id },
                        data: {
                            abonado: nuevoAbonado,
                            estado: nuevoAbonado >= cta.monto ? 'pagada' : 'pendiente'
                        }
                    });

                    abonoPendiente -= montoAbonar;
                }
            }

            // 10. Verificar si es devolución total para actualizar estado de venta original
            const totalItemsOriginales = ventaOriginal.items.reduce((acc, it) => acc + it.cantidad, 0);
            const totalItemsDevueltos = items.reduce((acc, it) => acc + it.cantidad, 0) +
                ventaOriginal.items.reduce((acc, it) => acc + (it.cantidadDevuelta || 0), 0);

            if (totalItemsOriginales === totalItemsDevueltos) {
                await tx.venta.update({
                    where: { id: ventaOriginal.id },
                    data: { estado: 'anulada' }
                });
            } else {
                await tx.venta.update({
                    where: { id: ventaOriginal.id },
                    data: { estado: 'parcial' }
                });
            }

            return {
                devolucion: ventaDevolucion,
                ventaOriginal: {
                    id: ventaOriginal.id,
                    numeroRecibo: ventaOriginal.numeroRecibo,
                    estadoActualizado: totalItemsOriginales === totalItemsDevueltos ? 'anulada' : 'parcial'
                },
                resumen: {
                    subtotal: -subtotalDevuelto,
                    iva: -ivaDevuelto,
                    total: -totalDevuelto,
                    costoTotal: -costoTotalDevuelto
                }
            };
        });

        res.json(resultado);
    } catch (error) {
        logger.error('Error en devolución:', error);
        res.status(500).json({ error: error.message || 'Error al procesar la devolución' });
    }
});

// Mantener endpoint anterior por compatibilidad (redirige al nuevo)
app.post('/api/devoluciones', async (req, res) => {
    try {
        const { ventaId, items, motivo, metodoReembolso, cuentaId } = req.body;
        const resultado = await prisma.$transaction(async (tx) => {
            const ventaOriginal = await tx.venta.findUnique({
                where: { id: parseInt(ventaId) },
                include: { items: true, cliente: true }
            });
            if (!ventaOriginal) throw new Error('Venta no encontrada');

            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const code = `DEV-${year}-`;
            const lastDev = await tx.devolucion.findFirst({
                where: { numeroDevolucion: { startsWith: code } },
                orderBy: { id: 'desc' }
            });
            let nextSeq = 1;
            if (lastDev && lastDev.numeroDevolucion) {
                const lastPart = lastDev.numeroDevolucion.split('-').pop();
                const num = parseInt(lastPart, 10);
                if (!isNaN(num)) nextSeq = num + 1;
            }
            const numeroDevolucion = `${code}${String(nextSeq).padStart(4, '0')}`;

            let subtotalDevuelto = 0;
            const itemsToCreate = [];
            for (const reqItem of items) {
                const originalItem = ventaOriginal.items.find(i => i.id === reqItem.itemVentaId);
                if (!originalItem) continue;
                const subtotalItem = originalItem.precioUnit * reqItem.cantidad;
                subtotalDevuelto += subtotalItem;
                itemsToCreate.push({
                    itemVentaId: originalItem.id,
                    productoId: originalItem.productoId,
                    nombre: originalItem.nombre,
                    codigo: originalItem.codigo,
                    cantidad: reqItem.cantidad,
                    precioUnit: originalItem.precioUnit,
                    subtotal: subtotalItem,
                    esServicio: originalItem.esServicio
                });
                if (originalItem.productoId && !originalItem.esServicio && originalItem.locationId) {
                    await tx.stockUbicacion.update({
                        where: { productoId_ubicacionId: { productoId: originalItem.productoId, ubicacionId: originalItem.locationId } },
                        data: { stock: { increment: reqItem.cantidad } }
                    });
                }
                await tx.itemVenta.update({
                    where: { id: originalItem.id },
                    data: { cantidadDevuelta: { increment: reqItem.cantidad } }
                });
            }

            const ivaDevuelto = Math.round(subtotalDevuelto * (ventaOriginal.ivaTasa / 100));
            const totalDevuelto = subtotalDevuelto + ivaDevuelto;
            let totalItemsOriginales = ventaOriginal.items.reduce((acc, it) => acc + it.cantidad, 0);
            let totalItemsDevueltos = items.reduce((acc, it) => acc + it.cantidad, 0) +
                ventaOriginal.items.reduce((acc, it) => acc + (it.cantidadDevuelta || 0), 0);
            const tipoDev = totalItemsOriginales === totalItemsDevueltos ? 'total' : 'parcial';

            const devolucion = await tx.devolucion.create({
                data: {
                    numeroDevolucion, ventaId: ventaOriginal.id, clienteId: ventaOriginal.clienteId,
                    tipo: tipoDev, motivo, subtotal: subtotalDevuelto, iva: ivaDevuelto,
                    total: totalDevuelto, metodoReembolso,
                    items: { create: itemsToCreate }
                }
            });

            if (metodoReembolso !== 'credito' && cuentaId) {
                const cuentaReembolso = await tx.cuentaFinanciera.findUnique({ where: { id: parseInt(cuentaId) } });
                if (!cuentaReembolso || cuentaReembolso.saldoActual < totalDevuelto) {
                    throw new Error(`Saldo insuficiente en el medio de pago seleccionado para el reembolso`);
                }
                await tx.movimientoCajaDevolucion.create({
                    data: {
                        tipo: 'salida', categoria: 'Devolución', monto: totalDevuelto, metodo: metodoReembolso,
                        referencia: numeroDevolucion, descripcion: `Reembolso devolución ${numeroDevolucion}`,
                        fecha: new Date(), hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                        cuentaId: parseInt(cuentaId), devolucionId: devolucion.id
                    }
                });
                await tx.cuentaFinanciera.update({
                    where: { id: parseInt(cuentaId) },
                    data: { saldoActual: { decrement: totalDevuelto } }
                });
            } else if (metodoReembolso === 'credito' && ventaOriginal.clienteId) {
                const cuentasCliente = await tx.cuentaPorCobrar.findMany({
                    where: { clienteId: ventaOriginal.clienteId, estado: 'pendiente' },
                    orderBy: { fechaCreacion: 'asc' }
                });
                let abonoPendiente = totalDevuelto;
                for (const cta of cuentasCliente) {
                    if (abonoPendiente <= 0) break;
                    const saldoRestante = cta.monto - (cta.abonado || 0);
                    if (saldoRestante <= 0) continue;
                    const montoAbonarAca = Math.min(saldoRestante, abonoPendiente);
                    await tx.abonoCobro.create({
                        data: {
                            cuentaPorCobrarId: cta.id, monto: montoAbonarAca, metodo: 'credito-devolucion',
                            fecha: new Date(), hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                        }
                    });
                    const nuevoAbonado = (cta.abonado || 0) + montoAbonarAca;
                    await tx.cuentaPorCobrar.update({
                        where: { id: cta.id },
                        data: { abonado: nuevoAbonado, estado: nuevoAbonado >= cta.monto ? 'pagada' : 'pendiente' }
                    });
                    abonoPendiente -= montoAbonarAca;
                }
            }
            if (tipoDev === 'total') {
                await tx.venta.update({ where: { id: ventaOriginal.id }, data: { estado: 'anulada' } });
            }
            return devolucion;
        });
        res.json(resultado);
    } catch (error) {
        logger.error('Error en devolución:', error);
        res.status(500).json({ error: error.message || 'Error al procesar la devolución' });
    }
});

// ═══════════════════════════════════════════════════════════════
// HISTORIAL Y ANALISIS
// ═══════════════════════════════════════════════════════════════

app.get('/api/ventas/historial', async (req, res) => {
    try {
        const ventas = await prisma.venta.findMany({
            where: { estado: "completada" },
            include: { items: { include: { producto: true } }, cliente: true, pagos: true },
            take: 50, orderBy: { createdAt: 'desc' }
        });
        const ventasDetail = ventas.map(venta => {
            let costoVentaVenta = 0, gananciaVenta = 0;
            const itemsConDetalle = venta.items.map(item => {
                let costoTotalItem = item.valor_compra_total != null ? item.valor_compra_total : (item.producto?.costo || 0) * item.cantidad;
                let ventaTotalItem = item.valor_venta_total != null ? item.valor_venta_total : item.precioUnit * item.cantidad;
                let gananciaItem = item.ganancia != null ? item.ganancia : (ventaTotalItem - costoTotalItem);
                costoVentaVenta += costoTotalItem;
                gananciaVenta += gananciaItem;
                return { ...item, costoTotalItem, ventaTotalItem, gananciaItem };
            });
            return { ...venta, items: itemsConDetalle, costoVenta: costoVentaVenta, ganancia: gananciaVenta };
        });
        res.json(ventasDetail);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

app.get('/api/analisis-financiero', async (req, res) => {
    try {
        let { startDate, endDate } = req.query;
        let start, end;
        if (!startDate || !endDate) {
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }
        const dateFilter = { createdAt: { gte: start, lte: end } };

        // Obtener todas las ventas (incluyendo VENTA y DEVOLUCION)
        const [productos, todasLasVentas, compras] = await Promise.all([
            prisma.producto.findMany({ where: { activo: true }, include: { stockUbicaciones: true } }),
            prisma.venta.findMany({
                where: {
                    ...dateFilter,
                    tipo: { in: ['VENTA', 'DEVOLUCION'] }
                },
                include: {
                    cliente: true,
                    items: { include: { producto: true } },
                    ventaOriginal: {
                        include: { cliente: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.compra.findMany({ where: { estado: "recibida", ...dateFilter } })
        ]);

        const reporteContable = [];

        // Separar ventas y devoluciones
        const ventasPositivas = todasLasVentas.filter(v => v.tipo === 'VENTA' || !v.tipo);
        const devoluciones = todasLasVentas.filter(v => v.tipo === 'DEVOLUCION');

        // Procesar ventas positivas
        const ventas = ventasPositivas.map(v => {
            let costoVentaOriginal = 0;
            const mappedItems = v.items.map(i => {
                const costoTotalItem = i.valor_compra_total || (i.producto?.costo || 0) * Math.abs(i.cantidad);
                const ventaTotalItem = i.valor_venta_total || (i.precioUnit * Math.abs(i.cantidad));
                const gananciaItem = i.ganancia || (ventaTotalItem - costoTotalItem);
                costoVentaOriginal += costoTotalItem;

                return {
                    ...i,
                    costoTotalItem,
                    ventaTotalItem,
                    gananciaItem,
                    // Redundancia para compatibilidad
                    valor_compra_total: costoTotalItem,
                    valor_venta_total: ventaTotalItem,
                    ganancia: gananciaItem
                };
            });

            const costoOriginalVentaTotal = v.items.reduce((acc, i) => acc + (i.valor_compra_total || (i.producto?.costo || 0) * Math.abs(i.cantidad)), 0);

            // Agregar al reporte contable
            reporteContable.push({
                id: `v-${v.id}`,
                fecha: v.createdAt,
                documento: v.numeroRecibo,
                cliente: v.cliente?.nombre || 'Cliente General',
                tipo: 'VENTA',
                itemsCount: v.items.length,
                subtotal: v.subtotal,
                total: v.total,
                costoVenta: costoOriginalVentaTotal,
                ganancia: v.total - costoOriginalVentaTotal,
                referencia: null
            });

            return {
                ...v,
                items: mappedItems,
                costoVenta: costoOriginalVentaTotal,
                ganancia: v.total - costoOriginalVentaTotal,
                tipo: v.tipo || 'VENTA'
            };
        });

        // Procesar devoluciones (ya vienen con valores negativos)
        const devolucionesProcesadas = devoluciones.map(d => {
            let costoDevolucion = 0;
            const mappedItems = d.items.map(i => {
                // Los valores ya están en negativo
                const costoTotalItem = i.valor_compra_total || 0;
                const ventaTotalItem = i.valor_venta_total || 0;
                const gananciaItem = i.ganancia || 0;
                costoDevolucion += costoTotalItem;

                return {
                    ...i,
                    costoTotalItem,
                    ventaTotalItem,
                    gananciaItem
                };
            });

            // Agregar al reporte contable
            reporteContable.push({
                id: `d-${d.id}`,
                fecha: d.createdAt,
                documento: d.numeroRecibo,
                cliente: d.cliente?.nombre || d.ventaOriginal?.cliente?.nombre || 'Cliente General',
                tipo: 'DEVOLUCION',
                itemsCount: d.items.length,
                subtotal: d.subtotal, // Ya negativo
                total: d.total, // Ya negativo
                costoVenta: costoDevolucion, // Ya negativo
                ganancia: d.total - costoDevolucion, // Ya negativo
                referencia: d.referencia
            });

            return {
                ...d,
                items: mappedItems,
                costoVenta: costoDevolucion,
                ganancia: d.total - costoDevolucion
            };
        });

        // Ordenar reporte contable por fecha (más reciente primero)
        reporteContable.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const lowStockList = productos.filter(p => p.stockUbicaciones.reduce((s, l) => s + l.stock, 0) <= p.stockMinimo);

        // ═══════════════════════════════════════════════════════════════
        // CÁLCULO CORRECTO: VENTAS BRUTAS, DEVOLUCIONES, VENTAS NETAS
        // ═══════════════════════════════════════════════════════════════

        // Ventas Brutas: suma de todas las ventas tipo VENTA
        let ventasBrutas = 0;
        let costoVentasBrutas = 0;
        let gananciaVentasBrutas = 0;

        ventas.forEach(v => {
            ventasBrutas += v.total;
            costoVentasBrutas += v.costoVenta;
            gananciaVentasBrutas += v.ganancia;
        });

        // Devoluciones: suma de todas las devoluciones (valores ya negativos)
        let totalDevoluciones = 0;
        let costoDevoluciones = 0;
        let gananciaDevoluciones = 0;

        devolucionesProcesadas.forEach(d => {
            totalDevoluciones += d.total; // Negativo
            costoDevoluciones += d.costoVenta; // Negativo
            gananciaDevoluciones += d.ganancia; // Negativo
        });

        // Ventas Netas = Ventas Brutas + Devoluciones (las devoluciones son negativas, así que resta)
        const ventasNetas = ventasBrutas + totalDevoluciones;
        const costoVentasNeto = costoVentasBrutas + costoDevoluciones;
        const utilidadNeta = gananciaVentasBrutas + gananciaDevoluciones;

        const totalInvertido = compras.reduce((s, c) => s + c.subtotal, 0);
        const margenRentabilidad = ventasNetas !== 0 ? (utilidadNeta / Math.abs(ventasNetas)) * 100 : 0;

        // Combinar ventas y devoluciones para el listado
        const todasVentasCombinadas = [...ventas, ...devolucionesProcesadas].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json({
            resumen: {
                // Nuevos campos para el análisis correcto
                ventasBrutas,
                totalDevoluciones: Math.abs(totalDevoluciones), // Mostrar como positivo en el resumen
                ventasNetas,
                costoVentasNeto,
                utilidadNeta,
                // Campos legacy para compatibilidad
                totalVendido: ventasNetas,
                totalCostoVentas: costoVentasNeto,
                totalGanancia: utilidadNeta,
                totalInvertido,
                margenRentabilidad,
                productosBajoStockCount: lowStockList.length
            },
            topBajoStock: lowStockList.slice(0, 5).map(p => ({
                id: p.id,
                nombre: p.nombre,
                stock: p.stockUbicaciones.reduce((s, l) => s + l.stock, 0),
                stockMinimo: p.stockMinimo
            })),
            ventas: todasVentasCombinadas,
            ventasPositivas: ventas,
            devoluciones: devolucionesProcesadas,
            reporteContable,
            compras
        });
    } catch (error) {
        logger.error('Error en análisis financiero:', error);
        res.status(500).json({ error: 'Error al obtener análisis' });
    }
});

// ═══════════════════════════════════════════════════════════════
// CUENTAS Y CAJA
// ═══════════════════════════════════════════════════════════════

async function inicializarCuentas() {
    const counts = await prisma.cuentaFinanciera.count();
    if (counts === 0) {
        await prisma.cuentaFinanciera.create({
            data: { nombre: 'Caja Principal', tipo: 'caja', saldoActual: 0, activo: true }
        });
        logger.info('✅ Cuenta por defecto "Caja Principal" creada');
    }
}
inicializarCuentas();

app.get('/api/cuentas-financieras', async (req, res) => {
    try {
        const cuentas = await prisma.cuentaFinanciera.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
        res.json(cuentas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener cuentas' });
    }
});

app.post('/api/cuentas-financieras', async (req, res) => {
    try {
        const { nombre, tipo, saldoInicial } = req.body;
        const cuenta = await prisma.cuentaFinanciera.create({
            data: { nombre, tipo, saldoActual: parseInt(saldoInicial) || 0, activo: true }
        });
        if (parseInt(saldoInicial) > 0) {
            await prisma.movimientoCaja.create({
                data: { tipo: 'entrada', categoria: 'Saldo inicial', monto: parseInt(saldoInicial), metodo: 'apertura', cuentaId: cuenta.id, hora: new Date().toLocaleTimeString('es-CO') }
            });
        }
        res.json(cuenta);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear cuenta' });
    }
});

app.get('/api/movimientos-financieros', async (req, res) => {
    try {
        const { cuentaId, startDate, endDate } = req.query;
        let whereClause = {};

        if (cuentaId) {
            whereClause.cuentaId = parseInt(cuentaId);
        }

        if (startDate || endDate) {
            whereClause.fecha = {};
            if (startDate) {
                // Agregar filtro desde el inicio del dia
                whereClause.fecha.gte = new Date(startDate + 'T00:00:00');
            }
            if (endDate) {
                // Agregar filtro hasta el final del dia
                whereClause.fecha.lte = new Date(endDate + 'T23:59:59.999');
            }
        }

        const movimientos = await prisma.movimientoCaja.findMany({
            where: whereClause,
            include: { cuenta: true },
            orderBy: { fecha: 'desc' },
            take: 200
        });
        res.json(movimientos);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Error al obtener movimientos' });
    }
});

app.post('/api/movimientos-financieros', async (req, res) => {
    try {
        const { tipo, categoria, monto, cuentaId, descripcion, metodo } = req.body;
        const amount = parseInt(monto);
        const accId = parseInt(cuentaId);

        if (isNaN(amount) || amount <= 0) throw new Error('El monto ingresado no es válido');
        if (isNaN(accId)) throw new Error('Debe seleccionar una cuenta válida');

        const resultado = await prisma.$transaction(async (tx) => {
            const cuenta = await tx.cuentaFinanciera.findUnique({ where: { id: accId } });
            if (tipo === 'salida' && cuenta.saldoActual < amount) throw new Error('Saldo insuficiente');
            const mov = await tx.movimientoCaja.create({
                data: { tipo, categoria, monto: amount, cuentaId: accId, descripcion, metodo, hora: new Date().toLocaleTimeString('es-CO') }
            });
            await tx.cuentaFinanciera.update({
                where: { id: accId },
                data: { saldoActual: tipo === 'entrada' ? { increment: amount } : { decrement: amount } }
            });
            return mov;
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/movimientos-financieros/traslado', async (req, res) => {
    try {
        const { origenId, destinoId, monto, descripcion } = req.body;
        const amount = parseInt(monto);
        await prisma.$transaction([
            prisma.cuentaFinanciera.update({ where: { id: parseInt(origenId) }, data: { saldoActual: { decrement: amount } } }),
            prisma.cuentaFinanciera.update({ where: { id: parseInt(destinoId) }, data: { saldoActual: { increment: amount } } }),
            prisma.movimientoCaja.create({ data: { tipo: 'salida', categoria: 'Traslado', monto: amount, cuentaId: parseInt(origenId), descripcion: `Traslado a ${destinoId}` } }),
            prisma.movimientoCaja.create({ data: { tipo: 'entrada', categoria: 'Traslado', monto: amount, cuentaId: parseInt(destinoId), descripcion: `Traslado desde ${origenId}` } })
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error en traslado' });
    }
});

// ═════════════════════════════════
// CIERRE DE CAJA DIARIO
// ═════════════════════════════════

app.get('/api/cierres', async (req, res) => {
    try {
        const cierres = await prisma.cierreCaja.findMany({ orderBy: { fechaApertura: 'desc' } });
        res.json(cierres);
    } catch (error) { res.status(500).json({ error: 'Error al obtener cierres' }); }
});

app.get('/api/cierres/hoy', async (req, res) => {
    try {
        const { cuentaId } = req.query;
        if (!cuentaId) return res.status(400).json({ error: 'cuentaId requerido' });
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const cierre = await prisma.cierreCaja.findFirst({ where: { cuentaId: parseInt(cuentaId), estado: 'abierta', fechaApertura: { gte: hoy } } });
        res.json({ activo: !!cierre, cierre });
    } catch (error) { res.json({ activo: false }); }
});

app.post('/api/cierres/abrir', async (req, res) => {
    try {
        const { saldoInicial, cuentaId } = req.body;
        const cierre = await prisma.cierreCaja.create({
            data: { saldoInicial: parseFloat(saldoInicial) || 0, cuentaId: parseInt(cuentaId), estado: 'abierta' }
        });
        res.json(cierre);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/cierres/cerrar', async (req, res) => {
    try {
        const { id, saldoReal, observaciones } = req.body;
        const sReal = parseFloat(saldoReal) || 0;

        const resultado = await prisma.$transaction(async (tx) => {
            const cierre = await tx.cierreCaja.findUnique({ where: { id: parseInt(id) } });
            if (!cierre) throw new Error('Cierre no encontrado');

            const hoyInicio = new Date(cierre.fechaApertura);
            hoyInicio.setHours(0, 0, 0, 0);
            const movimientos = await tx.movimientoCaja.findMany({
                where: { fecha: { gte: hoyInicio }, cuentaId: cierre.cuentaId }
            });

            let totalIngresos = 0, totalEgresos = 0;
            movimientos.forEach(m => {
                if (m.tipo === 'entrada') totalIngresos += m.monto;
                else if (m.tipo === 'salida') totalEgresos += m.monto;
            });

            const saldoTeorico = cierre.saldoInicial + totalIngresos - totalEgresos;
            const diferencia = sReal - saldoTeorico;

            // 1. Cerrar el actual
            const cierreActualizado = await tx.cierreCaja.update({
                where: { id: parseInt(id) },
                data: {
                    fechaCierre: new Date(), totalIngresos, totalEgresos,
                    saldoTeorico, saldoReal: sReal, diferencia, observaciones, estado: 'cerrada'
                }
            });

            // 2. Crear el nuevo periodo automáticamente (Rollover)
            const nuevaApertura = await tx.cierreCaja.create({
                data: {
                    saldoInicial: sReal,
                    cuentaId: cierre.cuentaId,
                    estado: 'abierta'
                }
            });

            return { cierreActualizado, nuevaApertura };
        });

        res.json(resultado.cierreActualizado);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Error al cerrar la caja' });
    }
});

// ═════════════════════════════════
// COMPRAS
// ═════════════════════════════════

app.get('/api/compras', async (req, res) => {
    try {
        const compras = await prisma.compra.findMany({ include: { proveedor: true }, orderBy: { createdAt: 'desc' } });
        res.json(compras);
    } catch (error) { res.status(500).json({ error: 'Error al cargar compras' }); }
});

// ═════════════════════════════════
// WHATSAPP API
// ═════════════════════════════════

app.get('/api/whatsapp/status', (req, res) => {
    res.json({ status: whatsappStatus, qr: whatsappQr });
});

app.post('/api/whatsapp/conectar', async (req, res) => {
    if (whatsappStatus === 'CONNECTED') {
        return res.status(400).json({ error: 'WhatsApp ya está conectado' });
    }
    if (whatsappStatus === 'CONNECTING' || whatsappStatus === 'QR_READY') {
        return res.json({ status: whatsappStatus, message: 'Ya se está generando el QR' });
    }

    whatsappStatus = 'CONNECTING';
    whatsappQr = null;

    try {
        client.initialize().catch(err => {
            logger.error('Error al inicializar cliente:', err);
            whatsappStatus = 'DISCONNECTED';
        });
        res.json({ success: true, message: 'Inicializando WhatsApp...' });
    } catch (error) {
        whatsappStatus = 'DISCONNECTED';
        res.status(500).json({ error: 'Error al iniciar conexión' });
    }
});

app.post('/api/whatsapp/notificar-vencidos', async (req, res) => {
    if (whatsappStatus !== 'CONNECTED') {
        return res.status(400).json({ error: 'WhatsApp no está conectado' });
    }

    try {
        const hoy = new Date();
        const vencidos = await prisma.cuentaPorCobrar.findMany({
            where: {
                estado: 'pendiente',
                fechaVencimiento: { lt: hoy }
            },
            include: { cliente: true }
        });

        if (vencidos.length === 0) {
            return res.json({ success: true, message: 'No hay cuentas vencidas para notificar' });
        }

        let enviados = 0;
        let errores = 0;

        for (const cuenta of vencidos) {
            if (!cuenta.cliente || !cuenta.cliente.telefono) continue;

            const phone = cuenta.cliente.telefono.replace(/\D/g, ''); // Limpiar el número
            if (!phone) continue;

            // Formatear para whatsapp-web.js (ej: 573105550000@c.us)
            const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;

            const message = `*Recordatorio de Pago - ${cuenta.cliente.nombre}*\n\nHola, te informamos que tienes una cuenta pendiente por valor de *${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(cuenta.monto - (cuenta.abonado || 0))}*.\n\nFecha de vencimiento: _${new Date(cuenta.fechaVencimiento).toLocaleDateString()}_\n\nPor favor, realiza el pago lo antes posible para evitar recargos. Si ya realizaste el pago, por favor ignora este mensaje.`;

            try {
                await client.sendMessage(chatId, message);
                enviados++;
                // Pequeño delay para no saturar
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                logger.error(`Error enviando a ${phone}:`, err);
                errores++;
            }
        }

        res.json({ success: true, enviados, errores });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar notificaciones' });
    }
});


// ═══════════════════════════════════════════════════════════════
// SISTEMA Y PERFIL
// ═══════════════════════════════════════════════════════════════

app.get('/api/perfil', async (req, res) => {
    try {
        const usuario = await prisma.usuario.findFirst({
            where: { activo: true }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'No se encontró un usuario activo. Por favor inicie sesión o cree un administrador.' });
        }
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

app.get('/api/notificaciones', async (req, res) => {
    try {
        const [productosBajoStock, cuentasVencidas] = await Promise.all([
            prisma.producto.findMany({
                where: {
                    activo: true,
                    stockUbicaciones: {
                        some: {}
                    }
                },
                include: { stockUbicaciones: true }
            }),
            prisma.cuentaPorCobrar.findMany({
                where: {
                    estado: 'pendiente'
                },
                include: { cliente: true }
            })
        ]);

        const stockAlerts = productosBajoStock.filter(p => {
            const totalStock = p.stockUbicaciones.reduce((sum, s) => sum + s.stock, 0);
            return totalStock <= p.stockMinimo;
        }).map(p => ({
            id: `stock-${p.id}`,
            title: 'Stock Bajo',
            message: `El producto ${p.nombre} tiene solo ${p.stockUbicaciones.reduce((sum, s) => sum + s.stock, 0)} unidades.`,
            time: 'Ahora',
            type: 'warning'
        }));

        const overdueAlerts = cuentasVencidas.filter(c => {
            return new Date(c.fechaVencimiento) < new Date();
        }).map(c => ({
            id: `cxc-${c.id}`,
            title: 'Cuenta Vencida',
            message: `El cliente ${c.cliente.nombre} tiene un saldo pendiente de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(c.monto - c.abonado)}.`,
            time: 'Urgente',
            type: 'danger'
        }));

        res.json([...stockAlerts, ...overdueAlerts]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

app.get('/api/roles', async (req, res) => {
    try {
        const roles = await prisma.rol.findMany();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener roles' });
    }
});

app.get('/api/ubicaciones', async (req, res) => {
    try {
        const ubicaciones = await prisma.ubicacion.findMany();
        res.json(ubicaciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ubicaciones' });
    }
});

app.get('/api/resoluciones', async (req, res) => {
    try {
        const resoluciones = await prisma.resolucion.findMany();
        res.json(resoluciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener resoluciones' });
    }
});

app.get('/api/cajas', async (req, res) => {
    try {
        const cajas = await prisma.cuentaFinanciera.findMany({
            where: { tipo: 'caja', activo: true }
        });
        res.json(cajas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener cajas' });
    }
});

app.get('/api/cuentas-cobrar', async (req, res) => {
    try {
        const cuentas = await prisma.cuentaPorCobrar.findMany({
            include: { cliente: true, abonos: true },
            orderBy: { fechaCreacion: 'desc' }
        });

        // Sincronizar estado con el saldo matemático real
        for (const cuenta of cuentas) {
            const saldoReal = cuenta.monto - (cuenta.abonado || 0);
            const estadoReal = saldoReal <= 0 ? 'pagada' : 'pendiente';
            if (cuenta.estado !== estadoReal) {
                await prisma.cuentaPorCobrar.update({
                    where: { id: cuenta.id },
                    data: { estado: estadoReal }
                });
                cuenta.estado = estadoReal; // Update for response
            }
        }

        res.json(cuentas);
    } catch (error) {
        logger.error('Error al obtener cuentas por cobrar:', error);
        res.status(500).json({ error: 'Error al obtener cuentas por cobrar' });
    }
});

app.get('/api/cuentas-pagar', async (req, res) => {
    try {
        const cuentas = await prisma.cuentaPorPagar.findMany({
            include: { proveedor: true, abonos: true },
            orderBy: { fechaCreacion: 'desc' }
        });

        // Sincronizar estado con el saldo matemático real
        for (const cuenta of cuentas) {
            const saldoReal = cuenta.monto - (cuenta.abonado || 0);
            const estadoReal = saldoReal <= 0 ? 'pagada' : 'pendiente';
            if (cuenta.estado !== estadoReal) {
                await prisma.cuentaPorPagar.update({
                    where: { id: cuenta.id },
                    data: { estado: estadoReal }
                });
                cuenta.estado = estadoReal; // Update for response
            }
        }

        res.json(cuentas);
    } catch (error) {
        logger.error('Error al obtener cuentas por pagar:', error);
        res.status(500).json({ error: 'Error al obtener cuentas por pagar' });
    }
});

app.get('/api/configuracion', async (req, res) => {
    try {
        const config = await prisma.configuracion.findFirst();
        if (!config) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});

app.post('/api/clientes/:id/abono-fifo', async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);
        const { monto, metodo, cuentaId } = req.body;
        const amount = parseInt(monto);
        const accId = parseInt(cuentaId);

        if (!clienteId || !amount || amount <= 0 || !accId) {
            return res.status(400).json({ error: 'Datos inválidos para el abono' });
        }

        const resultado = await prisma.$transaction(async (tx) => {
            const cuenta = await tx.cuentaFinanciera.findUnique({ where: { id: accId } });
            if (!cuenta) throw new Error('Cuenta de destino no encontrada');

            // Obtener TODAS las cuentas del cliente y filtrar por saldo real (monto - abonado > 0)
            // No confiar en el campo estado, usar cálculo matemático
            const todasLasCuentas = await tx.cuentaPorCobrar.findMany({
                where: { clienteId },
                orderBy: { fechaCreacion: 'asc' }
            });

            // Filtrar solo cuentas con saldo positivo usando cálculo matemático
            const cuentasConSaldo = todasLasCuentas.filter(cta => (cta.monto - (cta.abonado || 0)) > 0);

            let abonoRestante = amount;

            for (const cta of cuentasConSaldo) {
                if (abonoRestante <= 0) break;

                const saldo = cta.monto - (cta.abonado || 0);

                const montoAbonarAca = Math.min(saldo, abonoRestante);

                await tx.abonoCobro.create({
                    data: {
                        cuentaPorCobrarId: cta.id,
                        monto: montoAbonarAca,
                        metodo: metodo,
                        fecha: new Date(),
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    }
                });

                const nuevoAbonado = (cta.abonado || 0) + montoAbonarAca;
                await tx.cuentaPorCobrar.update({
                    where: { id: cta.id },
                    data: {
                        abonado: nuevoAbonado,
                        estado: nuevoAbonado >= cta.monto ? 'pagada' : 'pendiente'
                    }
                });

                abonoRestante -= montoAbonarAca;
            }

            await tx.movimientoCaja.create({
                data: {
                    tipo: 'entrada',
                    categoria: 'Cobro de cartera',
                    monto: amount,
                    metodo: metodo,
                    referencia: `Abono Cliente ${clienteId}`,
                    fecha: new Date(),
                    hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                    cuentaId: accId
                }
            });

            await tx.cuentaFinanciera.update({
                where: { id: accId },
                data: { saldoActual: { increment: amount } }
            });

            return { success: true };
        });

        res.json(resultado);
    } catch (error) {
        logger.error('Error en abono FIFO cliente:', error);
        res.status(500).json({ error: error.message || 'Error al procesar el abono' });
    }
});

app.post('/api/proveedores/:id/abono-fifo', async (req, res) => {
    try {
        const proveedorId = parseInt(req.params.id);
        const { monto, metodo, cuentaId } = req.body;
        const amount = parseInt(monto);
        const accId = parseInt(cuentaId);

        if (!proveedorId || !amount || amount <= 0 || !accId) {
            return res.status(400).json({ error: 'Datos inválidos para el abono' });
        }

        const resultado = await prisma.$transaction(async (tx) => {
            const cuenta = await tx.cuentaFinanciera.findUnique({ where: { id: accId } });
            if (!cuenta) throw new Error('Cuenta origen no encontrada');
            if (cuenta.saldoActual < amount) throw new Error('Saldo insuficiente en la cuenta seleccionada');

            // Obtener TODAS las cuentas del proveedor y filtrar por saldo real (monto - abonado > 0)
            // No confiar en el campo estado, usar cálculo matemático
            const todasLasCuentas = await tx.cuentaPorPagar.findMany({
                where: { proveedorId },
                orderBy: { fechaCreacion: 'asc' }
            });

            // Filtrar solo cuentas con saldo positivo usando cálculo matemático
            const cuentasConSaldo = todasLasCuentas.filter(cta => (cta.monto - (cta.abonado || 0)) > 0);

            let abonoRestante = amount;

            for (const cta of cuentasConSaldo) {
                if (abonoRestante <= 0) break;

                const saldo = cta.monto - (cta.abonado || 0);

                const montoAbonarAca = Math.min(saldo, abonoRestante);

                await tx.abonoPago.create({
                    data: {
                        cuentaPorPagarId: cta.id,
                        monto: montoAbonarAca,
                        metodo: metodo,
                        fecha: new Date(),
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    }
                });

                const nuevoAbonado = (cta.abonado || 0) + montoAbonarAca;
                await tx.cuentaPorPagar.update({
                    where: { id: cta.id },
                    data: {
                        abonado: nuevoAbonado,
                        estado: nuevoAbonado >= cta.monto ? 'pagada' : 'pendiente'
                    }
                });

                abonoRestante -= montoAbonarAca;
            }

            await tx.movimientoCaja.create({
                data: {
                    tipo: 'salida',
                    categoria: 'Pago a proveedor',
                    monto: amount,
                    metodo: metodo,
                    referencia: `Abono Proveedor ${proveedorId}`,
                    fecha: new Date(),
                    hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                    cuentaId: accId
                }
            });

            await tx.cuentaFinanciera.update({
                where: { id: accId },
                data: { saldoActual: { decrement: amount } }
            });

            return { success: true };
        });

        res.json(resultado);
    } catch (error) {
        logger.error('Error en abono FIFO proveedor:', error);
        res.status(500).json({ error: error.message || 'Error al procesar el abono' });
    }
});

app.post('/api/compras', async (req, res) => {
    try {
        const { proveedorId, items, subtotal, iva, total, metodoPago, cuentaId, numeroFactura, pagos, fechaVencimiento } = req.body;
        const resultado = await prisma.$transaction(async (tx) => {
            const hasCredit = metodoPago === 'credito' || (metodoPago === 'multiple' && pagos?.some(p => p.metodo === 'credito'));

            const compra = await tx.compra.create({
                data: {
                    proveedorId: proveedorId ? parseInt(proveedorId) : null,
                    numeroFactura, subtotal: parseInt(subtotal), iva: parseInt(iva), total: parseInt(total),
                    estado: hasCredit ? 'recibida' : 'pagada'
                }
            });

            for (const item of items) {
                await tx.itemCompra.create({
                    data: {
                        compraId: compra.id,
                        tipoItem: item.tipoItem || 'Producto',
                        productoId: item.productoId ? parseInt(item.productoId) : null,
                        nombre: item.nombre || item.descripcion || 'Sin nombre',
                        codigo: item.codigo || null,
                        cantidad: parseInt(item.cantidad) || 1,
                        precioUnit: parseInt(item.precioUnit) || 0,
                        descuento: parseInt(item.descuento) || 0,
                        impCargo: parseInt(item.impCargo) || 0,
                        subtotal: (parseInt(item.cantidad) || 1) * (parseInt(item.precioUnit) || 0),
                        ubicacionId: item.ubicacionId ? parseInt(item.ubicacionId) : null
                    }
                });
                if (item.productoId && item.ubicacionId) {
                    await tx.stockUbicacion.upsert({
                        where: { productoId_ubicacionId: { productoId: parseInt(item.productoId), ubicacionId: parseInt(item.ubicacionId) } },
                        update: { stock: { increment: parseInt(item.cantidad) } },
                        create: { productoId: parseInt(item.productoId), ubicacionId: parseInt(item.ubicacionId), stock: parseInt(item.cantidad) }
                    });
                }
            }

            if (metodoPago === 'multiple' && pagos) {
                for (const pago of pagos) {
                    if (pago.metodo === 'credito' && proveedorId) {
                        const cuentasProv = await tx.cuentaPorPagar.findMany({
                            where: { proveedorId: parseInt(proveedorId) },
                            orderBy: { fechaCreacion: 'asc' }
                        });
                        const cuentaAbierta = cuentasProv.find(c => (c.monto - (c.abonado || 0)) > 0);
                        const descDetalle = `Factura: ${numeroFactura || `Compra ${compra.id}`} - ${formatFecha(new Date())} - ${formatPesos(p.monto)}`;

                        if (cuentaAbierta) {
                            await tx.cuentaPorPagar.update({
                                where: { id: cuentaAbierta.id },
                                data: {
                                    monto: { increment: parseInt(p.monto) },
                                    descripcion: `${cuentaAbierta.descripcion} | ${descDetalle}`,
                                    estado: 'pendiente'
                                }
                            });
                        } else {
                            await tx.cuentaPorPagar.create({
                                data: {
                                    proveedorId: parseInt(proveedorId),
                                    monto: parseInt(p.monto),
                                    descripcion: descDetalle,
                                    fechaVencimiento: fechaVencimiento || new Date().toISOString().split('T')[0],
                                    numeroFactura: numeroFactura || null,
                                    estado: 'pendiente'
                                }
                            });
                        }
                    } else if (pago.cuentaId) {
                        await tx.movimientoCaja.create({
                            data: {
                                tipo: 'salida', categoria: 'Compra', monto: parseInt(pago.monto), metodo: pago.metodo,
                                referencia: `Compra ${compra.id}`, fecha: new Date(),
                                hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                                cuentaId: parseInt(pago.cuentaId)
                            }
                        });
                        await tx.cuentaFinanciera.update({
                            where: { id: parseInt(pago.cuentaId) },
                            data: { saldoActual: { decrement: parseInt(pago.monto) } }
                        });
                    }
                }
            } else if (metodoPago !== 'credito' && cuentaId) {
                await tx.movimientoCaja.create({
                    data: {
                        tipo: 'salida', categoria: 'Compra', monto: parseInt(total), metodo: metodoPago,
                        referencia: `Compra ${compra.id}`, fecha: new Date(),
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                        cuentaId: parseInt(cuentaId)
                    }
                });
                await tx.cuentaFinanciera.update({
                    where: { id: parseInt(cuentaId) },
                    data: { saldoActual: { decrement: parseInt(total) } }
                });
            } else if (metodoPago === 'credito' && proveedorId) {
                const cuentasProv = await tx.cuentaPorPagar.findMany({
                    where: { proveedorId: parseInt(proveedorId) },
                    orderBy: { fechaCreacion: 'asc' }
                });
                const cuentaAbierta = cuentasProv.find(c => (c.monto - (c.abonado || 0)) > 0);
                const descDetalle = `Factura: ${numeroFactura || `Compra ${compra.id}`} - ${formatFecha(new Date())} - ${formatPesos(total)}`;

                if (cuentaAbierta) {
                    await tx.cuentaPorPagar.update({
                        where: { id: cuentaAbierta.id },
                        data: {
                            monto: { increment: parseInt(total) },
                            descripcion: `${cuentaAbierta.descripcion} | ${descDetalle}`,
                            estado: 'pendiente'
                        }
                    });
                } else {
                    await tx.cuentaPorPagar.create({
                        data: {
                            proveedorId: parseInt(proveedorId),
                            monto: parseInt(total),
                            descripcion: descDetalle,
                            fechaVencimiento: fechaVencimiento || new Date().toISOString().split('T')[0],
                            numeroFactura: numeroFactura || null,
                            estado: 'pendiente'
                        }
                    });
                }
            }
            return compra;
        });
        res.json(resultado);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Middleware global de errores en Express
app.use((err, req, res, next) => {
    logger.error(err.stack || err);
    res.status(500).json({ message: 'Error interno del servidor' });
});

// Servir archivos estáticos del Frontend (Vite build)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all para que el ruteo de React funcione (SPA)
app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
});

app.listen(PORT, () => {
    logger.info(`🚀 Servidor POS corriendo en puerto ${PORT}`);
});
