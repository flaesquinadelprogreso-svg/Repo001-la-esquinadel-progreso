const fs = require('fs');
if (fs.existsSync('.env')) {
    require('dotenv').config();
}
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


const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secreto-temporal-en-lo-que-railway-funciona-2026';
if (!process.env.JWT_SECRET) {
    console.warn('\n⚠️ ATENCIÓN CRÍTICA: La variable JWT_SECRET no fue inyectada por Railway. Utilizando secreto de respaldo para permitir el arranque.\n');
}

// Middleware de autenticación global
const verifyToken = (req, res, next) => {
    // Si la ruta es pública (relativa a /api), omitir verificación
    const publicPaths = ['/login', '/health'];
    if (publicPaths.includes(req.path)) {
        return next();
    }

    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'No se proveyó un token' });
    const token = header.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.user = decoded;
        next();
    });
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE WHATSAPP (Baileys)
// ═══════════════════════════════════════════════════════════════
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

let whatsappQr = null;
let whatsappStatus = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, QR_READY, CONNECTED
let waSock = null;
let waLogoutIntencional = false;
let waReconnectAttempts = 0;
let waReconnectTimer = null;
const WA_MAX_RECONNECTS = 3;
const WA_AUTH_DIR = path.join(__dirname, '.baileys_auth');

// Validar número de teléfono (7-15 dígitos según E.164)
function validatePhone(numero) {
    if (!numero) return null;
    const phone = numero.replace(/\D/g, '');
    if (phone.length < 7 || phone.length > 15) return null;
    return phone;
}

async function startWhatsApp() {
    if (whatsappStatus === 'CONNECTING' || whatsappStatus === 'CONNECTED') return;

    // Limpiar socket anterior si existe
    if (waSock) {
        try { waSock.ev.removeAllListeners(); } catch (_) {}
        waSock = null;
    }

    whatsappStatus = 'CONNECTING';
    whatsappQr = null;
    waLogoutIntencional = false;
    waReconnectAttempts = 0;
    logger.info('Iniciando WhatsApp con Baileys...');

    try {
        // Limpiar auth viejo de whatsapp-web.js si existe
        const oldAuth = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(oldAuth)) {
            fs.rmSync(oldAuth, { recursive: true, force: true });
            logger.info('Auth viejo de whatsapp-web.js eliminado');
        }

        if (!fs.existsSync(WA_AUTH_DIR)) fs.mkdirSync(WA_AUTH_DIR, { recursive: true });
        const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);

        const { version } = await fetchLatestWaWebVersion({});
        logger.info('WA Web version: ' + JSON.stringify(version));

        waSock = makeWASocket({
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
            logger: pino({ level: 'silent' }),
            version,
        });
        logger.info('Socket de WhatsApp creado, esperando QR...');

        waSock.ev.on('creds.update', saveCreds);

        waSock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            logger.info('WhatsApp connection.update: ' + JSON.stringify({ connection, hasQr: !!qr, statusCode: lastDisconnect?.error?.output?.statusCode }));

            if (qr) {
                whatsappQr = qr;
                whatsappStatus = 'QR_READY';
                logger.info('QR de WhatsApp generado. Escanea para conectar.');
            }
            if (connection === 'open') {
                whatsappStatus = 'CONNECTED';
                whatsappQr = null;
                waReconnectAttempts = 0;
                logger.info('WhatsApp conectado correctamente (Baileys)');
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                logger.info('WhatsApp desconectado. statusCode: ' + statusCode + ', reason: ' + JSON.stringify(lastDisconnect?.error?.message));
                whatsappStatus = 'DISCONNECTED';
                whatsappQr = null;
                waSock = null;

                if (statusCode === DisconnectReason.loggedOut || waLogoutIntencional) {
                    logger.info('Sesion cerrada, limpiando auth...');
                    if (fs.existsSync(WA_AUTH_DIR)) fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
                    waReconnectAttempts = 0;
                } else if (waReconnectAttempts < WA_MAX_RECONNECTS) {
                    waReconnectAttempts++;
                    logger.info('Reconectando WhatsApp (intento ' + waReconnectAttempts + '/' + WA_MAX_RECONNECTS + ')...');
                    waReconnectTimer = setTimeout(() => startWhatsApp(), 3000);
                } else {
                    logger.info('Maximo de reconexiones alcanzado. Use el boton Vincular para reintentar.');
                    waReconnectAttempts = 0;
                }
            }
        });
    } catch (err) {
        logger.error('Error al iniciar WhatsApp: ' + err.message);
        whatsappStatus = 'DISCONNECTED';
        waSock = null;
    }
}

// CORS: Siempre debe ir ANTES del Rate Limit para no perder encabezados al rechazar conexiones excesivas
app.use(cors({
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Rate Limit
const limiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 500 });
app.use('/api', limiter);

// Login rate limiter: max 10 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.' },
    standardHeaders: true
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Rutas públicas base
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Protegiendo toda la API por defecto (Deny-by-default) salvo excepciones pre-programadas
app.use('/api', verifyToken);

// Rate limiter específico para envíos de WhatsApp (máx 10 por minuto)
const waLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Demasiados envíos de WhatsApp. Intente en un momento.' }
});

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE RUTAS PÚBLICAS Y AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════

app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        // Buscar el usuario en la base de datos
        const user = await prisma.usuario.findUnique({
            where: { username }
        });

        if (user && user.activo && await bcrypt.compare(password, user.password)) {
            // Resolve permissions: user override > role defaults
            let permisos = [];
            if (user.role === 'admin') {
                permisos = ['all'];
            } else if (user.permisos) {
                try { permisos = JSON.parse(user.permisos); } catch { permisos = []; }
            } else {
                const rol = await prisma.rol.findFirst({ where: { nombre: { equals: user.role, mode: 'insensitive' } } });
                if (rol && rol.permisos) {
                    try { permisos = JSON.parse(rol.permisos); } catch { permisos = []; }
                }
            }

            const token = jwt.sign(
                { id: user.id, role: user.role, username: user.username, permisos },
                JWT_SECRET,
                { expiresIn: '12h' }
            );
            res.json({
                success: true,
                token,
                user: { username: user.username, role: user.role, permisos }
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
                { nombre: { contains: search, mode: 'insensitive' } },
                { codigo: { contains: search, mode: 'insensitive' } }
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

app.get('/api/productos/recientes', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12;
        const recientes = await prisma.itemVenta.findMany({
            where: { venta: { estado: 'completada', tipo: 'VENTA' } },
            orderBy: { id: 'desc' },
            select: { productoId: true, servicioId: true },
            take: 300
        });
        // Obtener IDs únicos manteniendo orden de más reciente
        const seenProd = new Set();
        const seenServ = new Set();
        const items = []; // { type, id }
        for (const item of recientes) {
            if (item.productoId && !seenProd.has(item.productoId)) {
                seenProd.add(item.productoId);
                items.push({ type: 'product', id: item.productoId });
            } else if (item.servicioId && !seenServ.has(item.servicioId)) {
                seenServ.add(item.servicioId);
                items.push({ type: 'service', id: item.servicioId });
            }
            if (items.length >= limit) break;
        }
        if (items.length === 0) return res.json([]);
        const prodIds = items.filter(i => i.type === 'product').map(i => i.id);
        const servIds = items.filter(i => i.type === 'service').map(i => i.id);
        const [productos, servicios] = await Promise.all([
            prodIds.length > 0 ? prisma.producto.findMany({ where: { id: { in: prodIds }, activo: true }, include: { stockUbicaciones: { include: { ubicacion: true } } } }) : [],
            servIds.length > 0 ? prisma.servicio.findMany({ where: { id: { in: servIds }, activo: true } }) : []
        ]);
        const prodMap = new Map(productos.map(p => [`product-${p.id}`, { ...p, _type: 'product' }]));
        const servMap = new Map(servicios.map(s => [`service-${s.id}`, { ...s, _type: 'service' }]));
        const result = items.map(i => i.type === 'product' ? prodMap.get(`product-${i.id}`) : servMap.get(`service-${i.id}`)).filter(Boolean);
        res.json(result);
    } catch (error) {
        console.error('Error fetching recent products:', error);
        res.status(500).json({ error: 'Error al obtener productos recientes' });
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
                usuario: { select: { username: true } },
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
                usuario: { select: { username: true } },
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

        // Validar cantidades
        for (const item of items) {
            const qty = parseInt(item.cantidad);
            if (!Number.isInteger(qty) || qty <= 0) {
                return res.status(400).json({ error: `Cantidad inválida para ${item.nombre || 'item'}` });
            }
        }

        // Validar que al menos una caja esté abierta para poder vender
        if (metodoPago !== 'credito') {
            const cajaAbierta = await prisma.cierreCaja.findFirst({ where: { estado: 'abierta' } });
            if (!cajaAbierta) return res.status(400).json({ error: 'Debe tener al menos una caja abierta para registrar ventas.' });
        }

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
                    usuarioId: req.user?.id || null,
                    items: { create: finalItemsList }
                },
                include: { cliente: true }
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
                            cuentaId: targetCuentaId,
                            usuarioId: req.user?.id || null
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
                usuario: { select: { username: true } },
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
                    usuarioId: req.user?.id || null,
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
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                        usuarioId: req.user?.id || null
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
                            hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                            usuarioId: req.user?.id || null
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
                    usuarioId: req.user?.id || null,
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
                            fecha: new Date(), hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                            usuarioId: req.user?.id || null
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
            include: { items: { include: { producto: true } }, cliente: true, pagos: true, usuario: { select: { username: true } } },
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
            prisma.compra.findMany({ where: { estado: "recibida", ...dateFilter }, include: { proveedor: true } })
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

        // Calcular productos de menor movimiento (KPI)
        const productStats = {};
        productos.forEach(p => {
            productStats[p.id] = {
                id: p.id,
                nombre: p.nombre,
                qty: 0,
                stock: p.stockUbicaciones.reduce((s, l) => s + l.stock, 0)
            };
        });

        ventasPositivas.forEach(v => {
            if (v.estado === 'anulada') return;
            v.items.forEach(i => {
                if (i.productoId && productStats[i.productoId]) {
                    productStats[i.productoId].qty += Math.abs(i.cantidad);
                }
            });
        });

        const pocoMovimientoList = Object.values(productStats).sort((a, b) => {
            if (a.qty !== b.qty) return a.qty - b.qty;
            return b.stock - a.stock; // Si tienen la misma venta, el que tiene más stock inactivo es peor
        });

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

        // Calcular Capital Inmovilizado (Stock Total * Costo de Compra)
        let capitalInmovilizado = 0;
        productos.forEach(p => {
            const stockTotal = p.stockUbicaciones.reduce((s, l) => s + l.stock, 0);
            capitalInmovilizado += (stockTotal * (p.costo || 0));
        });

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
                capitalInmovilizado, // Agregado aquí
                margenRentabilidad,
                productosBajoStockCount: lowStockList.length
            },
            topBajoStock: lowStockList.map(p => ({
                id: p.id,
                nombre: p.nombre,
                codigo: p.codigo,
                stock: p.stock,
                stockMinimo: p.stockMinimo
            })),
            topPocoMovimiento: pocoMovimientoList.slice(0, 10),
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
        const { nombre, tipo, saldoInicial, numeroCuenta } = req.body;
        const last4 = (tipo === 'banco' && numeroCuenta) ? numeroCuenta.replace(/\D/g, '').slice(-4) : null;
        const cuenta = await prisma.cuentaFinanciera.create({
            data: { nombre, tipo, saldoActual: parseInt(saldoInicial) || 0, activo: true, numeroCuenta: last4 }
        });
        if (parseInt(saldoInicial) > 0) {
            await prisma.movimientoCaja.create({
                data: { tipo: 'entrada', categoria: 'Saldo inicial', monto: parseInt(saldoInicial), metodo: 'apertura', cuentaId: cuenta.id, hora: new Date().toLocaleTimeString('es-CO'), usuarioId: req.user?.id || null }
            });
        }
        res.json(cuenta);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear cuenta' });
    }
});

app.delete('/api/cuentas-financieras/:id', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar cuentas' });
    try {
        const id = parseInt(req.params.id);
        await prisma.$transaction(async (tx) => {
            const cuenta = await tx.cuentaFinanciera.findUnique({ where: { id } });
            if (!cuenta) throw new Error('Cuenta financiera no encontrada');

            const primeraCaja = await tx.cuentaFinanciera.findFirst({ where: { tipo: 'caja' }, orderBy: { id: 'asc' } });
            if (primeraCaja && primeraCaja.id === id) throw new Error('No se puede eliminar la Caja Principal del sistema');

            if (cuenta.saldoActual !== 0) throw new Error('Solo se pueden eliminar cuentas con saldo en $0');

            const cierreAbierto = await tx.cierreCaja.findFirst({ where: { cuentaId: id, estado: 'abierto' } });
            if (cierreAbierto) throw new Error('Esta cuenta tiene un cierre de caja abierto. Ciérrelo antes de eliminar.');

            await tx.movimientoCaja.updateMany({ where: { cuentaId: id }, data: { cuentaId: null } });
            await tx.movimientoCajaDevolucion.updateMany({ where: { cuentaId: id }, data: { cuentaId: null } });
            await tx.cierreCaja.deleteMany({ where: { cuentaId: id } });
            await tx.cuentaFinanciera.delete({ where: { id } });
        });
        res.json({ success: true, message: 'Cuenta eliminada exitosamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
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
            include: { cuenta: true, usuario: { select: { username: true } } },
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
            if (!cuenta) throw new Error('Cuenta financiera no encontrada');
            if (tipo === 'salida' && cuenta.saldoActual < amount) throw new Error('Saldo insuficiente');
            const mov = await tx.movimientoCaja.create({
                data: { tipo, categoria, monto: amount, cuentaId: accId, descripcion, metodo, hora: new Date().toLocaleTimeString('es-CO'), usuarioId: req.user?.id || null }
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
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });

        await prisma.$transaction(async (tx) => {
            const origen = await tx.cuentaFinanciera.findUnique({ where: { id: parseInt(origenId) } });
            if (!origen) throw new Error('Cuenta origen no encontrada');
            if (origen.saldoActual < amount) throw new Error(`Saldo insuficiente en ${origen.nombre}. Disponible: ${origen.saldoActual}`);

            const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            await tx.cuentaFinanciera.update({ where: { id: parseInt(origenId) }, data: { saldoActual: { decrement: amount } } });
            await tx.cuentaFinanciera.update({ where: { id: parseInt(destinoId) }, data: { saldoActual: { increment: amount } } });
            await tx.movimientoCaja.create({ data: { tipo: 'salida', categoria: 'Traslado', monto: amount, metodo: 'efectivo', hora, cuentaId: parseInt(origenId), descripcion: descripcion || `Traslado a cuenta ${destinoId}`, usuarioId: req.user?.id || null } });
            await tx.movimientoCaja.create({ data: { tipo: 'entrada', categoria: 'Traslado', monto: amount, metodo: 'efectivo', hora, cuentaId: parseInt(destinoId), descripcion: descripcion || `Traslado desde cuenta ${origenId}`, usuarioId: req.user?.id || null } });
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Error en traslado' });
    }
});

// ═════════════════════════════════
// CIERRE DE CAJA DIARIO
// ═════════════════════════════════

app.get('/api/cierres', async (req, res) => {
    try {
        const cierres = await prisma.cierreCaja.findMany({ include: { usuario: { select: { username: true } } }, orderBy: { fechaApertura: 'desc' } });
        res.json(cierres);
    } catch (error) { res.status(500).json({ error: 'Error al obtener cierres' }); }
});

app.get('/api/cierres/hoy', async (req, res) => {
    try {
        const { cuentaId } = req.query;
        if (!cuentaId) return res.status(400).json({ error: 'cuentaId requerido' });
        const cId = parseInt(cuentaId);

        // Buscar caja abierta sin filtro de fecha
        let cierre = await prisma.cierreCaja.findFirst({ where: { cuentaId: cId, estado: 'abierta' } });

        // Auto-recovery: si no hay caja abierta pero sí hay cierres previos,
        // crear automáticamente una nueva apertura usando el saldoReal del último cierre.
        // Esto garantiza que el usuario solo abre caja manualmente la PRIMERA vez.
        if (!cierre) {
            const lastClosed = await prisma.cierreCaja.findFirst({
                where: { cuentaId: cId, estado: 'cerrada' },
                orderBy: { fechaCierre: 'desc' }
            });
            if (lastClosed) {
                cierre = await prisma.cierreCaja.create({
                    data: { saldoInicial: lastClosed.saldoReal, cuentaId: cId, estado: 'abierta', usuarioId: req.user?.id || null }
                });
            }
        }

        res.json({ activo: !!cierre, cierre });
    } catch (error) { res.json({ activo: false }); }
});

app.post('/api/cierres/abrir', async (req, res) => {
    try {
        const { saldoInicial, cuentaId } = req.body;
        const monto = parseFloat(saldoInicial) || 0;
        const cId = parseInt(cuentaId);

        const resultado = await prisma.$transaction(async (tx) => {
            // Prevenir apertura doble
            const yaAbierta = await tx.cierreCaja.findFirst({
                where: { cuentaId: cId, estado: 'abierta' }
            });
            if (yaAbierta) throw new Error('Esta caja ya está abierta');

            const cierre = await tx.cierreCaja.create({
                data: { saldoInicial: monto, cuentaId: cId, estado: 'abierta', usuarioId: req.user?.id || null }
            });

            // Actualizar saldo de la cuenta financiera con el saldo inicial
            await tx.cuentaFinanciera.update({
                where: { id: cId },
                data: { saldoActual: monto }
            });

            // Crear movimiento de entrada por apertura
            if (monto > 0) {
                await tx.movimientoCaja.create({
                    data: { tipo: 'entrada', categoria: 'Apertura de caja', monto, metodo: 'apertura', cuentaId: cId, hora: new Date().toLocaleTimeString('es-CO'), usuarioId: req.user?.id || null }
                });
            }

            return cierre;
        });

        res.json(resultado);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/cierres/cerrar', async (req, res) => {
    try {
        const { id, saldoReal, observaciones } = req.body;
        const sReal = parseFloat(saldoReal) || 0;

        const resultado = await prisma.$transaction(async (tx) => {
            const cierre = await tx.cierreCaja.findUnique({ where: { id: parseInt(id) } });
            if (!cierre) throw new Error('Cierre no encontrado');

            // Capturar todos los movimientos desde la apertura de caja (no solo hoy)
            const movimientos = await tx.movimientoCaja.findMany({
                where: { fecha: { gte: cierre.fechaApertura }, cuentaId: cierre.cuentaId }
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

            // 2. Actualizar saldo de la cuenta al saldo real contado
            await tx.cuentaFinanciera.update({
                where: { id: cierre.cuentaId },
                data: { saldoActual: sReal }
            });

            // 3. Crear el nuevo periodo automáticamente (Rollover)
            const nuevaApertura = await tx.cierreCaja.create({
                data: {
                    saldoInicial: sReal,
                    cuentaId: cierre.cuentaId,
                    estado: 'abierta',
                    usuarioId: req.user?.id || null
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
        const compras = await prisma.compra.findMany({ include: { proveedor: true, usuario: { select: { username: true } } }, orderBy: { createdAt: 'desc' } });
        res.json(compras);
    } catch (error) { res.status(500).json({ error: 'Error al cargar compras' }); }
});

app.get('/api/compras/:id', async (req, res) => {
    try {
        const compra = await prisma.compra.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { proveedor: true, usuario: { select: { username: true } }, items: { include: { producto: true, ubicacion: true } } }
        });
        if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
        res.json(compra);
    } catch (error) { res.status(500).json({ error: 'Error al cargar compra' }); }
});

app.delete('/api/compras/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.$transaction(async (tx) => {
            const compra = await tx.compra.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!compra) throw new Error('Compra no encontrada');

            // 1. Revertir stock
            for (const item of compra.items) {
                if (item.productoId && item.ubicacionId) {
                    await tx.stockUbicacion.update({
                        where: { productoId_ubicacionId: { productoId: item.productoId, ubicacionId: item.ubicacionId } },
                        data: { stock: { decrement: item.cantidad } }
                    });
                }
            }

            // 2. Revertir movimientos financieros y saldos
            const movimientos = await tx.movimientoCaja.findMany({
                where: { referencia: `Compra ${id}` }
            });
            for (const mov of movimientos) {
                await tx.cuentaFinanciera.update({
                    where: { id: mov.cuentaId },
                    data: { saldoActual: { increment: mov.monto } }
                });
            }
            await tx.movimientoCaja.deleteMany({ where: { referencia: `Compra ${id}` } });

            // 3. Revertir cuentas por pagar si fue a crédito
            if (compra.proveedorId) {
                const cuentasProv = await tx.cuentaPorPagar.findMany({
                    where: { proveedorId: compra.proveedorId },
                    orderBy: { fechaCreacion: 'desc' }
                });
                for (const cuenta of cuentasProv) {
                    if (cuenta.descripcion && cuenta.descripcion.includes(`Compra ${id}`)) {
                        await tx.cuentaPorPagar.delete({ where: { id: cuenta.id } });
                        break;
                    } else if (cuenta.descripcion && (cuenta.descripcion.includes(compra.numeroFactura || `Compra ${id}`))) {
                        const nuevoMonto = cuenta.monto - compra.total;
                        if (nuevoMonto <= 0) {
                            await tx.cuentaPorPagar.delete({ where: { id: cuenta.id } });
                        } else {
                            await tx.cuentaPorPagar.update({
                                where: { id: cuenta.id },
                                data: { monto: nuevoMonto }
                            });
                        }
                        break;
                    }
                }
            }

            // 4. Eliminar items y compra
            await tx.itemCompra.deleteMany({ where: { compraId: id } });
            await tx.compra.delete({ where: { id } });
        });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/compras/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { proveedorId, items, subtotal, iva, total, metodoPago, cuentaId, numeroFactura, pagos, fechaVencimiento, tipoDocumento, fechaElaboracion, contacto, observaciones, descuentoGlobal, reteIva, reteIca } = req.body;

        const resultado = await prisma.$transaction(async (tx) => {
            // === REVERTIR LA COMPRA ANTERIOR ===
            const compraAnterior = await tx.compra.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!compraAnterior) throw new Error('Compra no encontrada');

            // Revertir stock
            for (const item of compraAnterior.items) {
                if (item.productoId && item.ubicacionId) {
                    await tx.stockUbicacion.update({
                        where: { productoId_ubicacionId: { productoId: item.productoId, ubicacionId: item.ubicacionId } },
                        data: { stock: { decrement: item.cantidad } }
                    });
                }
            }

            // Revertir movimientos financieros
            const movimientos = await tx.movimientoCaja.findMany({
                where: { referencia: `Compra ${id}` }
            });
            for (const mov of movimientos) {
                await tx.cuentaFinanciera.update({
                    where: { id: mov.cuentaId },
                    data: { saldoActual: { increment: mov.monto } }
                });
            }
            await tx.movimientoCaja.deleteMany({ where: { referencia: `Compra ${id}` } });

            // Revertir cuentas por pagar si la compra anterior fue a crédito
            if (compraAnterior.proveedorId) {
                const cuentasProv = await tx.cuentaPorPagar.findMany({
                    where: { proveedorId: compraAnterior.proveedorId },
                    orderBy: { fechaCreacion: 'desc' }
                });
                for (const cuenta of cuentasProv) {
                    if (cuenta.descripcion && cuenta.descripcion.includes(`Compra ${id}`)) {
                        // Si el monto coincide exactamente, eliminar
                        await tx.cuentaPorPagar.delete({ where: { id: cuenta.id } });
                        break;
                    } else if (cuenta.descripcion && (cuenta.descripcion.includes(compraAnterior.numeroFactura || `Compra ${id}`))) {
                        // Si es parte de una cuenta acumulada, decrementar el monto
                        const nuevoMonto = cuenta.monto - compraAnterior.total;
                        if (nuevoMonto <= 0) {
                            await tx.cuentaPorPagar.delete({ where: { id: cuenta.id } });
                        } else {
                            await tx.cuentaPorPagar.update({
                                where: { id: cuenta.id },
                                data: { monto: nuevoMonto }
                            });
                        }
                        break;
                    }
                }
            }

            await tx.itemCompra.deleteMany({ where: { compraId: id } });

            // === ACTUALIZAR CON NUEVOS DATOS ===
            const hasCredit = metodoPago === 'credito' || (metodoPago === 'multiple' && pagos?.some(p => p.metodo === 'credito'));

            const compra = await tx.compra.update({
                where: { id },
                data: {
                    proveedorId: proveedorId ? parseInt(proveedorId) : null,
                    numeroFactura,
                    tipoDocumento: tipoDocumento || undefined,
                    fechaElaboracion: fechaElaboracion ? new Date(fechaElaboracion) : undefined,
                    contacto: contacto || null,
                    observaciones: observaciones || null,
                    subtotal: parseInt(subtotal),
                    descuentoGlobal: parseInt(descuentoGlobal) || 0,
                    iva: parseInt(iva),
                    reteIva: parseInt(reteIva) || 0,
                    reteIca: parseInt(reteIca) || 0,
                    total: parseInt(total),
                    estado: hasCredit ? 'recibida' : 'pagada'
                }
            });

            // Crear nuevos items y actualizar stock
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

            // Procesar pagos
            if (metodoPago === 'multiple' && pagos) {
                for (const pago of pagos) {
                    if (pago.metodo === 'credito' && proveedorId) {
                        const cuentasProv = await tx.cuentaPorPagar.findMany({
                            where: { proveedorId: parseInt(proveedorId) },
                            orderBy: { fechaCreacion: 'asc' }
                        });
                        const cuentaAbierta = cuentasProv.find(c => (c.monto - (c.abonado || 0)) > 0);
                        const descDetalle = `Factura: ${numeroFactura || `Compra ${compra.id}`} - ${formatFecha(new Date())} - ${formatPesos(pago.monto)}`;
                        if (cuentaAbierta) {
                            await tx.cuentaPorPagar.update({
                                where: { id: cuentaAbierta.id },
                                data: { monto: { increment: parseInt(pago.monto) }, descripcion: `${cuentaAbierta.descripcion} | ${descDetalle}`, estado: 'pendiente' }
                            });
                        } else {
                            await tx.cuentaPorPagar.create({
                                data: { proveedorId: parseInt(proveedorId), monto: parseInt(pago.monto), descripcion: descDetalle, fechaVencimiento: fechaVencimiento || new Date().toISOString().split('T')[0], numeroFactura: numeroFactura || null, estado: 'pendiente' }
                            });
                        }
                    } else if (pago.cuentaId) {
                        await tx.movimientoCaja.create({
                            data: { tipo: 'salida', categoria: 'Compra', monto: parseInt(pago.monto), metodo: pago.metodo, referencia: `Compra ${compra.id}`, fecha: new Date(), hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), cuentaId: parseInt(pago.cuentaId), usuarioId: req.user?.id || null }
                        });
                        await tx.cuentaFinanciera.update({
                            where: { id: parseInt(pago.cuentaId) },
                            data: { saldoActual: { decrement: parseInt(pago.monto) } }
                        });
                    }
                }
            } else if (metodoPago !== 'credito' && cuentaId) {
                await tx.movimientoCaja.create({
                    data: { tipo: 'salida', categoria: 'Compra', monto: parseInt(total), metodo: metodoPago, referencia: `Compra ${compra.id}`, fecha: new Date(), hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), cuentaId: parseInt(cuentaId), usuarioId: req.user?.id || null }
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
                        data: { monto: { increment: parseInt(total) }, descripcion: `${cuentaAbierta.descripcion} | ${descDetalle}`, estado: 'pendiente' }
                    });
                } else {
                    await tx.cuentaPorPagar.create({
                        data: { proveedorId: parseInt(proveedorId), monto: parseInt(total), descripcion: descDetalle, fechaVencimiento: fechaVencimiento || new Date().toISOString().split('T')[0], numeroFactura: numeroFactura || null, estado: 'pendiente' }
                    });
                }
            }

            return compra;
        });
        res.json(resultado);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ═════════════════════════════════
// WHATSAPP API (Baileys)
// ═════════════════════════════════

app.get('/api/whatsapp/status', async (req, res) => {
    let hasSavedSession = false;
    try {
        const files = await fs.promises.readdir(WA_AUTH_DIR);
        hasSavedSession = files.length > 0;
    } catch (_) {}
    res.json({ status: whatsappStatus, qr: whatsappQr, hasSavedSession });
});

app.post('/api/whatsapp/conectar', async (req, res) => {
    if (whatsappStatus === 'CONNECTED') {
        return res.json({ status: 'CONNECTED', message: 'WhatsApp ya está conectado' });
    }
    if (whatsappStatus === 'CONNECTING' || whatsappStatus === 'QR_READY') {
        return res.json({ status: whatsappStatus, message: 'Ya se está generando el QR' });
    }
    try {
        await startWhatsApp();
        res.json({ success: true, message: 'Inicializando WhatsApp...' });
    } catch (error) {
        whatsappStatus = 'DISCONNECTED';
        res.status(500).json({ error: 'Error al iniciar conexión' });
    }
});

app.post('/api/whatsapp/desconectar', async (req, res) => {
    try {
        waLogoutIntencional = true;
        if (waReconnectTimer) { clearTimeout(waReconnectTimer); waReconnectTimer = null; }
        if (waSock) {
            try { waSock.ev.removeAllListeners(); } catch (_) {}
            await waSock.logout();
            waSock = null;
        }
        whatsappStatus = 'DISCONNECTED';
        whatsappQr = null;
        if (fs.existsSync(WA_AUTH_DIR)) fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
        res.json({ success: true, message: 'WhatsApp desconectado' });
    } catch (error) {
        whatsappStatus = 'DISCONNECTED';
        waSock = null;
        if (fs.existsSync(WA_AUTH_DIR)) fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
        res.json({ success: true, message: 'Sesion cerrada' });
    }
});

// Enviar resumen de cuentas vencidas al número del jefe/empresa
app.post('/api/whatsapp/notificar-vencidos', waLimiter, async (req, res) => {
    if (whatsappStatus !== 'CONNECTED' || !waSock) {
        return res.status(400).json({ error: 'WhatsApp no está conectado' });
    }

    try {
        // Obtener número destino desde configuración o del body
        let destino = req.body.numero;
        if (!destino) {
            const config = await prisma.configuracion.findFirst();
            destino = config?.whatsappDestino;
        }
        if (!destino) {
            return res.status(400).json({ error: 'No hay número de destino configurado. Configure el número en Configuración > WhatsApp.' });
        }

        // Validar número
        const phone = validatePhone(destino);
        if (!phone) {
            return res.status(400).json({ error: 'Número de destino inválido' });
        }
        const jid = `${phone}@s.whatsapp.net`;

        // Buscar cuentas por cobrar pendientes/vencidas
        const hoy = new Date().toISOString().split('T')[0];
        const vencidos = await prisma.cuentaPorCobrar.findMany({
            where: {
                estado: { in: ['pendiente', 'vencida'] },
            },
            include: { cliente: true },
            orderBy: { fechaVencimiento: 'asc' }
        });

        if (vencidos.length === 0) {
            return res.json({ success: true, message: 'No hay cuentas por cobrar pendientes' });
        }

        // Separar vencidas de pendientes
        const cuentasVencidas = vencidos.filter(c => c.fechaVencimiento <= hoy);
        const cuentasPendientes = vencidos.filter(c => c.fechaVencimiento > hoy);

        const formatCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

        let msg = `*RESUMEN DE CUENTAS POR COBRAR*\n_${new Date().toLocaleDateString('es-CO')}_\n\n`;

        if (cuentasVencidas.length > 0) {
            const totalVencido = cuentasVencidas.reduce((s, c) => s + (c.monto - (c.abonado || 0)), 0);
            msg += `*VENCIDAS (${cuentasVencidas.length}):* Total: ${formatCOP(totalVencido)}\n`;
            msg += `────────────────\n`;
            for (const c of cuentasVencidas) {
                const saldo = c.monto - (c.abonado || 0);
                msg += `- *${c.cliente?.nombre || 'Sin cliente'}*\n`;
                msg += `  Saldo: ${formatCOP(saldo)} | Venc: ${c.fechaVencimiento}\n`;
                if (c.cliente?.telefono) msg += `  Tel: ${c.cliente.telefono}\n`;
            }
            msg += `\n`;
        }

        if (cuentasPendientes.length > 0) {
            const totalPendiente = cuentasPendientes.reduce((s, c) => s + (c.monto - (c.abonado || 0)), 0);
            msg += `*PENDIENTES (${cuentasPendientes.length}):* Total: ${formatCOP(totalPendiente)}\n`;
            msg += `────────────────\n`;
            for (const c of cuentasPendientes) {
                const saldo = c.monto - (c.abonado || 0);
                msg += `- *${c.cliente?.nombre || 'Sin cliente'}*: ${formatCOP(saldo)} (vence ${c.fechaVencimiento})\n`;
            }
        }

        const totalGeneral = vencidos.reduce((s, c) => s + (c.monto - (c.abonado || 0)), 0);
        msg += `\n*TOTAL POR COBRAR: ${formatCOP(totalGeneral)}*`;

        await waSock.sendMessage(jid, { text: msg });
        res.json({ success: true, message: `Resumen enviado a ${destino}`, cuentasVencidas: cuentasVencidas.length, cuentasPendientes: cuentasPendientes.length });
    } catch (error) {
        logger.error('Error enviando resumen WhatsApp:', error);
        res.status(500).json({ error: 'Error al enviar el mensaje' });
    }
});

// Enviar mensaje de texto libre a un número
app.post('/api/whatsapp/enviar', waLimiter, async (req, res) => {
    if (whatsappStatus !== 'CONNECTED' || !waSock) {
        return res.status(400).json({ error: 'WhatsApp no está conectado' });
    }
    try {
        const { numero, mensaje } = req.body;
        if (!numero || !mensaje) return res.status(400).json({ error: 'Número y mensaje son requeridos' });
        const phone = validatePhone(numero);
        if (!phone) return res.status(400).json({ error: 'Número inválido (7-15 dígitos)' });
        if (mensaje.length > 4096) return res.status(400).json({ error: 'Mensaje demasiado largo' });
        const jid = `${phone}@s.whatsapp.net`;
        await waSock.sendMessage(jid, { text: mensaje });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error enviando mensaje WhatsApp:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

// Mensaje de prueba para verificar que WhatsApp funciona
app.post('/api/whatsapp/prueba', waLimiter, async (req, res) => {
    if (whatsappStatus !== 'CONNECTED' || !waSock) {
        return res.status(400).json({ error: 'WhatsApp no está conectado' });
    }
    try {
        const { numero } = req.body;
        if (!numero) return res.status(400).json({ error: 'Número destino requerido' });
        const phone = validatePhone(numero);
        if (!phone) return res.status(400).json({ error: 'Número inválido (7-15 dígitos)' });
        const jid = `${phone}@s.whatsapp.net`;

        const config = await prisma.configuracion.findFirst();
        const empresa = config?.nombreEmpresa || 'Almacén Refrielectric The Company';

        const msg = `*MENSAJE DE PRUEBA*\n\n` +
            `Este es un mensaje de prueba del sistema *${empresa}*.\n\n` +
            `Si recibes este mensaje, la conexion de WhatsApp esta funcionando correctamente.\n\n` +
            `────────────────\n` +
            `_Enviado automaticamente desde el sistema POS_\n` +
            `_${new Date().toLocaleString('es-CO')}_`;

        await waSock.sendMessage(jid, { text: msg });
        res.json({ success: true, message: 'Mensaje de prueba enviado a ' + numero });
    } catch (error) {
        logger.error('Error enviando prueba WhatsApp:', error);
        res.status(500).json({ error: 'Error al enviar mensaje de prueba' });
    }
});

// Enviar recibo/factura PDF por WhatsApp al cliente
app.post('/api/whatsapp/enviar-recibo', waLimiter, async (req, res) => {
    if (whatsappStatus !== 'CONNECTED' || !waSock) {
        return res.status(400).json({ error: 'WhatsApp no está conectado' });
    }
    try {
        const { numero, pdfBase64, filename, recibo } = req.body;
        if (!numero) return res.status(400).json({ error: 'Número del cliente requerido' });
        if (!pdfBase64) return res.status(400).json({ error: 'PDF requerido' });

        const phone = validatePhone(numero);
        if (!phone) return res.status(400).json({ error: 'Número inválido (7-15 dígitos)' });

        // Limitar tamaño del PDF (máx ~7.5MB decodificado)
        if (pdfBase64.length > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'PDF demasiado grande (máx 7.5MB)' });
        }

        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        // Validar magic bytes de PDF
        if (pdfBuffer.length < 4 || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
            return res.status(400).json({ error: 'El archivo no es un PDF válido' });
        }

        const jid = `${phone}@s.whatsapp.net`;
        const config = await prisma.configuracion.findFirst();
        const empresa = config?.nombreEmpresa || 'Almacén Refrielectric The Company';
        const fmt = (v) => '$' + Math.round(Number(v) || 0).toLocaleString('es-CO');

        // Sanitizar filename
        const safeName = (filename || 'Recibo.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

        const caption = `*${empresa}* - Recibo #${recibo?.receiptNumber || ''}\n` +
            `*Total: ${fmt(recibo?.total)}*` +
            (recibo?.ivaTasa != null ? ` (IVA ${recibo.ivaTasa}%)` : '') +
            `\n¡Gracias por su compra!`;

        // Enviar PDF como documento
        await waSock.sendMessage(jid, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: safeName,
            caption
        });

        res.json({ success: true, message: 'Recibo PDF enviado por WhatsApp' });
    } catch (error) {
        logger.error('Error enviando recibo WhatsApp:', error);
        res.status(500).json({ error: 'Error al enviar recibo por WhatsApp' });
    }
});

// ═══════════════════════════════════════════════════════════════
// SISTEMA Y PERFIL
// ═══════════════════════════════════════════════════════════════

app.get('/api/perfil', async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.user.id }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'No se encontró el usuario.' });
        }
        const { password, ...userData } = usuario;

        // Resolve permissions: user override > role defaults
        let permisos = [];
        if (usuario.role === 'admin') {
            permisos = ['all'];
        } else if (usuario.permisos) {
            try { permisos = JSON.parse(usuario.permisos); } catch { permisos = []; }
        } else {
            const rol = await prisma.rol.findFirst({ where: { nombre: { equals: usuario.role, mode: 'insensitive' } } });
            if (rol && rol.permisos) {
                try { permisos = JSON.parse(rol.permisos); } catch { permisos = []; }
            }
        }

        res.json({ ...userData, permisos });
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
            message: `El cliente ${c.cliente?.nombre || 'Sin nombre'} tiene un saldo pendiente de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(c.monto - (c.abonado || 0))}.`,
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
        const roles = await prisma.rol.findMany({ orderBy: { id: 'asc' } });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener roles' });
    }
});

app.post('/api/roles', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden crear roles' });
        const { nombre, descripcion, permisos } = req.body;
        if (!nombre) return res.status(400).json({ error: 'El nombre del rol es requerido' });
        const rol = await prisma.rol.create({
            data: { nombre, descripcion: descripcion || null, permisos: typeof permisos === 'string' ? permisos : JSON.stringify(permisos || []) }
        });
        res.status(201).json(rol);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
        res.status(500).json({ error: 'Error al crear rol' });
    }
});

app.put('/api/roles/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden editar roles' });
        const { nombre, descripcion, permisos } = req.body;
        const rol = await prisma.rol.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(nombre && { nombre }),
                ...(descripcion !== undefined && { descripcion }),
                ...(permisos !== undefined && { permisos: typeof permisos === 'string' ? permisos : JSON.stringify(permisos) })
            }
        });
        res.json(rol);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
        res.status(500).json({ error: 'Error al actualizar rol' });
    }
});

app.delete('/api/roles/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar roles' });
        await prisma.rol.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar rol' });
    }
});

// ═══════════════════════════════════════════════════════════════
// GESTIÓN DE USUARIOS
// ═══════════════════════════════════════════════════════════════

app.get('/api/usuarios', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden ver usuarios' });
        const usuarios = await prisma.usuario.findMany({
            orderBy: { id: 'asc' },
            select: { id: true, username: true, role: true, permisos: true, activo: true, createdAt: true, updatedAt: true }
        });
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden crear usuarios' });
        const { username, password, role, permisos } = req.body;
        if (!username || !password || !role) return res.status(400).json({ error: 'Username, contraseña y rol son requeridos' });
        if (password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const usuario = await prisma.usuario.create({
            data: {
                username, password: hashedPassword, role,
                permisos: permisos ? (typeof permisos === 'string' ? permisos : JSON.stringify(permisos)) : null
            }
        });
        const { password: _, ...userData } = usuario;
        res.status(201).json(userData);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe un usuario con ese nombre' });
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden editar usuarios' });
        const id = parseInt(req.params.id);
        const { username, password, role, activo, permisos } = req.body;
        const updateData = {};
        if (username) updateData.username = username;
        if (role) updateData.role = role;
        if (activo !== undefined) updateData.activo = activo;
        if (permisos !== undefined) updateData.permisos = permisos ? (typeof permisos === 'string' ? permisos : JSON.stringify(permisos)) : null;
        if (password) {
            if (password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
            updateData.password = await bcrypt.hash(password, 10);
        }
        const usuario = await prisma.usuario.update({
            where: { id },
            data: updateData
        });
        const { password: _, ...userData } = usuario;
        res.json(userData);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe un usuario con ese nombre' });
        if (error.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar usuarios' });
        const id = parseInt(req.params.id);
        if (id === req.user.id) return res.status(400).json({ error: 'No puede eliminar su propia cuenta' });
        // Soft delete - deactivate instead of deleting
        await prisma.usuario.update({
            where: { id },
            data: { activo: false }
        });
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
        res.status(500).json({ error: 'Error al desactivar usuario' });
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

// Crear cuenta por cobrar manualmente (acumula si ya existe una abierta para el mismo cliente)
app.post('/api/cuentas-cobrar', async (req, res) => {
    try {
        const { clienteId, descripcion, monto, fechaVencimiento } = req.body;
        if (!clienteId || !monto) return res.status(400).json({ error: 'Cliente y monto son requeridos' });

        const resultado = await prisma.$transaction(async (tx) => {
            // Buscar cuenta abierta existente para este cliente (cálculo matemático, no confiar en estado)
            const cuentasCliente = await tx.cuentaPorCobrar.findMany({
                where: { clienteId: parseInt(clienteId) },
                orderBy: { fechaCreacion: 'asc' }
            });
            const cuentaAbierta = cuentasCliente.find(c => (c.monto - (c.abonado || 0)) > 0);

            if (cuentaAbierta) {
                // Acumular en la cuenta existente
                return await tx.cuentaPorCobrar.update({
                    where: { id: cuentaAbierta.id },
                    data: {
                        monto: { increment: parseInt(monto) },
                        descripcion: `${cuentaAbierta.descripcion} | ${descripcion || 'Cuenta manual'}`,
                        estado: 'pendiente'
                    }
                });
            } else {
                // Crear nueva cuenta
                return await tx.cuentaPorCobrar.create({
                    data: {
                        clienteId: parseInt(clienteId),
                        descripcion: descripcion || 'Cuenta manual',
                        monto: parseInt(monto),
                        fechaVencimiento: fechaVencimiento || new Date().toISOString().split('T')[0],
                        estado: 'pendiente'
                    }
                });
            }
        });

        res.json(resultado);
    } catch (error) {
        logger.error('Error al crear cuenta por cobrar:', error);
        res.status(500).json({ error: 'Error al crear cuenta por cobrar' });
    }
});

// Eliminar cuenta por cobrar y sus abonos/movimientos
app.delete('/api/cuentas-cobrar/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar cuentas' });
        const id = parseInt(req.params.id);
        await prisma.$transaction(async (tx) => {
            const cuenta = await tx.cuentaPorCobrar.findUnique({ where: { id }, include: { abonos: { include: { movimientoCaja: true } } } });
            if (!cuenta) throw new Error('Cuenta no encontrada');
            // Revertir movimientos de caja de los abonos
            for (const abono of cuenta.abonos) {
                if (abono.movimientoCaja) {
                    await tx.movimientoCaja.delete({ where: { id: abono.movimientoCaja.id } });
                }
            }
            // Cascade elimina abonos automáticamente
            await tx.cuentaPorCobrar.delete({ where: { id } });
        });
        res.json({ success: true, message: 'Cuenta por cobrar eliminada' });
    } catch (error) {
        logger.error('Error al eliminar cuenta por cobrar:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar cuenta' });
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

// Crear cuenta por pagar manualmente (acumula si ya existe una abierta para el mismo proveedor)
app.post('/api/cuentas-pagar', async (req, res) => {
    try {
        const { proveedorId, descripcion, monto, fechaVencimiento } = req.body;
        if (!proveedorId || !monto) return res.status(400).json({ error: 'Proveedor y monto son requeridos' });

        const resultado = await prisma.$transaction(async (tx) => {
            // Buscar cuenta abierta existente para este proveedor (cálculo matemático, no confiar en estado)
            const cuentasProveedor = await tx.cuentaPorPagar.findMany({
                where: { proveedorId: parseInt(proveedorId) },
                orderBy: { fechaCreacion: 'asc' }
            });
            const cuentaAbierta = cuentasProveedor.find(c => (c.monto - (c.abonado || 0)) > 0);

            if (cuentaAbierta) {
                // Acumular en la cuenta existente
                return await tx.cuentaPorPagar.update({
                    where: { id: cuentaAbierta.id },
                    data: {
                        monto: { increment: parseInt(monto) },
                        descripcion: `${cuentaAbierta.descripcion} | ${descripcion || 'Cuenta manual'}`,
                        estado: 'pendiente'
                    }
                });
            } else {
                // Crear nueva cuenta
                return await tx.cuentaPorPagar.create({
                    data: {
                        proveedorId: parseInt(proveedorId),
                        descripcion: descripcion || 'Cuenta manual',
                        monto: parseInt(monto),
                        fechaVencimiento: fechaVencimiento || new Date().toISOString().split('T')[0],
                        estado: 'pendiente'
                    }
                });
            }
        });

        res.json(resultado);
    } catch (error) {
        logger.error('Error al crear cuenta por pagar:', error);
        res.status(500).json({ error: 'Error al crear cuenta por pagar' });
    }
});

// Eliminar cuenta por pagar y sus abonos/movimientos
app.delete('/api/cuentas-pagar/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar cuentas' });
        const id = parseInt(req.params.id);
        await prisma.$transaction(async (tx) => {
            const cuenta = await tx.cuentaPorPagar.findUnique({ where: { id }, include: { abonos: { include: { movimientoCaja: true } } } });
            if (!cuenta) throw new Error('Cuenta no encontrada');
            // Revertir movimientos de caja de los abonos
            for (const abono of cuenta.abonos) {
                if (abono.movimientoCaja) {
                    await tx.movimientoCaja.delete({ where: { id: abono.movimientoCaja.id } });
                }
            }
            // Cascade elimina abonos automáticamente
            await tx.cuentaPorPagar.delete({ where: { id } });
        });
        res.json({ success: true, message: 'Cuenta por pagar eliminada' });
    } catch (error) {
        logger.error('Error al eliminar cuenta por pagar:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar cuenta' });
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

app.put('/api/configuracion', async (req, res) => {
    try {
        const { nombreEmpresa, nit, direccion, telefono, email, moneda, ivaDefecto, whatsappDestino } = req.body;
        const config = await prisma.configuracion.upsert({
            where: { id: 1 },
            update: { nombreEmpresa, nit, direccion, telefono, email, moneda, ivaDefecto, whatsappDestino },
            create: { nombreEmpresa, nit, direccion, telefono, email, moneda: moneda || 'COP', ivaDefecto: ivaDefecto || 19, whatsappDestino }
        });
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar configuración' });
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
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                        usuarioId: req.user?.id || null
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
                    cuentaId: accId,
                    usuarioId: req.user?.id || null
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
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                        usuarioId: req.user?.id || null
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
                    cuentaId: accId,
                    usuarioId: req.user?.id || null
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
                    estado: hasCredit ? 'recibida' : 'pagada',
                    usuarioId: req.user?.id || null
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
                        const descDetalle = `Factura: ${numeroFactura || `Compra ${compra.id}`} - ${formatFecha(new Date())} - ${formatPesos(pago.monto)}`;

                        if (cuentaAbierta) {
                            await tx.cuentaPorPagar.update({
                                where: { id: cuentaAbierta.id },
                                data: {
                                    monto: { increment: parseInt(pago.monto) },
                                    descripcion: `${cuentaAbierta.descripcion} | ${descDetalle}`,
                                    estado: 'pendiente'
                                }
                            });
                        } else {
                            await tx.cuentaPorPagar.create({
                                data: {
                                    proveedorId: parseInt(proveedorId),
                                    monto: parseInt(pago.monto),
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
                                cuentaId: parseInt(pago.cuentaId),
                                usuarioId: req.user?.id || null
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
                        cuentaId: parseInt(cuentaId),
                        usuarioId: req.user?.id || null
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

// ═══════════════════════════════════════════════════════════════
// BOTÓN DE PÁNICO — RESET TOTAL (Solo admin)
// ═══════════════════════════════════════════════════════════════
app.post('/api/admin/panic-reset', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo el administrador puede realizar esta acción' });
        }

        const { confirmCode } = req.body;
        if (confirmCode !== 'RESETEAR') {
            return res.status(400).json({ error: 'Código de confirmación incorrecto' });
        }

        await prisma.$transaction(async (tx) => {
            // Orden de eliminación respetando foreign keys (hijos primero)
            await tx.movimientoCajaDevolucion.deleteMany();
            await tx.movimientoCaja.deleteMany();
            await tx.pagoVenta.deleteMany();
            await tx.itemDevolucion.deleteMany();
            await tx.itemVenta.deleteMany();
            await tx.itemCompra.deleteMany();
            await tx.devolucion.deleteMany();
            await tx.abonoCobro.deleteMany();
            await tx.abonoPago.deleteMany();
            await tx.cuentaPorCobrar.deleteMany();
            await tx.cuentaPorPagar.deleteMany();
            await tx.venta.deleteMany();
            await tx.compra.deleteMany();
            await tx.cierreCaja.deleteMany();
            await tx.stockUbicacion.deleteMany();

            // Eliminar inventario (productos y servicios)
            await tx.producto.deleteMany();
            await tx.servicio.deleteMany();

            // Caja Principal: la primera cuenta tipo 'caja' (persiste siempre)
            const cajaPrincipal = await tx.cuentaFinanciera.findFirst({
                where: { tipo: 'caja' },
                orderBy: { id: 'asc' }
            });

            // Eliminar TODAS las cuentas financieras excepto Caja Principal
            if (cajaPrincipal) {
                await tx.cuentaFinanciera.deleteMany({ where: { id: { not: cajaPrincipal.id } } });
                await tx.cuentaFinanciera.update({ where: { id: cajaPrincipal.id }, data: { saldoActual: 0 } });
            }

            // Resetear resoluciones al inicio
            const resoluciones = await tx.resolucion.findMany();
            for (const r of resoluciones) {
                await tx.resolucion.update({ where: { id: r.id }, data: { actual: r.desde } });
            }
        });

        res.json({ success: true, message: 'Sistema reseteado correctamente. Todos los datos transaccionales han sido eliminados.' });
    } catch (error) {
        logger.error('Error en panic reset:', error);
        res.status(500).json({ error: 'Error al resetear el sistema: ' + error.message });
    }
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

    // Auto-reconectar WhatsApp si hay sesión guardada
    if (fs.existsSync(WA_AUTH_DIR) && fs.readdirSync(WA_AUTH_DIR).length > 0) {
        logger.info('Sesion de WhatsApp encontrada, reconectando automaticamente...');
        startWhatsApp().catch(err => logger.error('Error en auto-reconexion WhatsApp: ' + err.message));
    }
});
