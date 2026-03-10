const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create ubicaciones
    const ubicaciones = await Promise.all([
        prisma.ubicacion.upsert({
            where: { nombre: 'Bodega Principal' },
            update: {},
            create: { nombre: 'Bodega Principal' }
        }),
        prisma.ubicacion.upsert({
            where: { nombre: 'Mostrador' },
            update: {},
            create: { nombre: 'Mostrador' }
        }),
        prisma.ubicacion.upsert({
            where: { nombre: 'Vitrina' },
            update: {},
            create: { nombre: 'Vitrina' }
        }),
    ]);

    console.log('Created ubicaciones:', ubicaciones.length);

    // Create sample clients
    const clientes = await Promise.all([
        prisma.cliente.upsert({
            where: { documento: '1234567890' },
            update: {},
            create: {
                nombre: 'Juan Pérez',
                documento: '1234567890',
                telefono: '3001234567',
                email: 'juan@email.com',
                direccion: 'Calle 123 #45-67'
            }
        }),
        prisma.cliente.upsert({
            where: { documento: '0987654321' },
            update: {},
            create: {
                nombre: 'María García',
                documento: '0987654321',
                telefono: '3109876543',
                email: 'maria@email.com',
                direccion: 'Carrera 10 #20-30'
            }
        }),
        prisma.cliente.upsert({
            where: { documento: '1122334455' },
            update: {},
            create: {
                nombre: 'Carlos López',
                documento: '1122334455',
                telefono: '3205544332',
                email: 'carlos@email.com',
                direccion: 'Avenida 5 #15-20'
            }
        }),
    ]);

    console.log('Created clientes:', clientes.length);

    // Create sample proveedores
    const proveedores = await Promise.all([
        prisma.proveedor.upsert({
            where: { nit: '900123456-1' },
            update: {},
            create: {
                nombre: 'Distribuidora ABC',
                nit: '900123456-1',
                telefono: '6012345678',
                email: 'abc@dist.com',
                direccion: 'Zona Industrial Norte'
            }
        }),
        prisma.proveedor.upsert({
            where: { nit: '800987654-2' },
            update: {},
            create: {
                nombre: 'Importadores XYZ',
                nit: '800987654-2',
                telefono: '6098765432',
                email: 'xyz@import.com',
                direccion: 'Puerto Sur'
            }
        }),
    ]);

    console.log('Created proveedores:', proveedores.length);

    // Create sample products
    const productos = await Promise.all([
        prisma.producto.upsert({
            where: { codigo: 'HER001' },
            update: {},
            create: {
                codigo: 'HER001',
                nombre: 'Martillo Stanley 16oz',
                descripcion: 'Martillo de uña con mango de fibra de vidrio',
                precio: 48500,
                costo: 32000,
                stockMinimo: 10,
                categoria: 'Herramientas'
            }
        }),
        prisma.producto.upsert({
            where: { codigo: 'MAT001' },
            update: {},
            create: {
                codigo: 'MAT001',
                nombre: 'Cemento Argos x 50kg',
                descripcion: 'Cemento de uso general para construcción',
                precio: 32000,
                costo: 24000,
                stockMinimo: 20,
                precioMayor: 29500,
                categoria: 'Materiales'
            }
        }),
        prisma.producto.upsert({
            where: { codigo: 'ELE001' },
            update: {},
            create: {
                codigo: 'ELE001',
                nombre: 'Taladro Bosch GSB 13 RE',
                descripcion: 'Taladro percutor professional 650W',
                precio: 289000,
                costo: 195000,
                stockMinimo: 5,
                categoria: 'Eléctricos'
            }
        }),
        prisma.producto.upsert({
            where: { codigo: 'PIN001' },
            update: {},
            create: {
                codigo: 'PIN001',
                nombre: 'Pintura Viniltex Blanca 1gal',
                descripcion: 'Pintura premium para interiores',
                precio: 72000,
                costo: 48000,
                stockMinimo: 15,
                categoria: 'Pinturas'
            }
        }),
        prisma.producto.upsert({
            where: { codigo: 'PLO001' },
            update: {},
            create: {
                codigo: 'PLO001',
                nombre: 'Tubo PVC 1/2" x 6m',
                descripcion: 'Tubo para presión de agua fría',
                precio: 12500,
                costo: 8200,
                stockMinimo: 50,
                categoria: 'Plomería'
            }
        }),
    ]);

    console.log('Created productos:', productos.length);

    // Create stock for products in locations (using ids from created records)
    const bodegaId = ubicaciones.find(u => u.nombre === 'Bodega Principal').id;
    const mostradorId = ubicaciones.find(u => u.nombre === 'Mostrador').id;
    const vitrinaId = ubicaciones.find(u => u.nombre === 'Vitrina').id;

    const prod1Id = productos.find(p => p.codigo === 'HER001').id;
    const prod2Id = productos.find(p => p.codigo === 'MAT001').id;
    const prod3Id = productos.find(p => p.codigo === 'ELE001').id;
    const prod4Id = productos.find(p => p.codigo === 'PIN001').id;
    const prod5Id = productos.find(p => p.codigo === 'PLO001').id;

    // First delete existing stock
    await prisma.stockUbicacion.deleteMany({});

    const stockUbicaciones = await Promise.all([
        prisma.stockUbicacion.create({ data: { productoId: prod1Id, ubicacionId: mostradorId, stock: 12 } }),
        prisma.stockUbicacion.create({ data: { productoId: prod2Id, ubicacionId: bodegaId, stock: 85 } }),
        prisma.stockUbicacion.create({ data: { productoId: prod2Id, ubicacionId: mostradorId, stock: 10 } }),
        prisma.stockUbicacion.create({ data: { productoId: prod3Id, ubicacionId: vitrinaId, stock: 3 } }),
        prisma.stockUbicacion.create({ data: { productoId: prod4Id, ubicacionId: bodegaId, stock: 24 } }),
        prisma.stockUbicacion.create({ data: { productoId: prod5Id, ubicacionId: bodegaId, stock: 100 } }),
    ]);

    console.log('Created stock ubicaciones:', stockUbicaciones.length);

    // Create sample services (Clear first since codigo is no longer unique)
    await prisma.servicio.deleteMany({});
    const servicios = await Promise.all([
        prisma.servicio.create({
            data: {
                codigo: 'SERVT1',
                nombre: 'Instalación de Cerraduras',
                descripcion: 'Servicio técnico especializado en cerrajería',
                precio: 45000
            }
        }),
        prisma.servicio.create({
            data: {
                codigo: 'SERVT1',
                nombre: 'Mantenimiento de Herramientas',
                descripcion: 'Revisión y puesta a punto de maquinaria eléctrica',
                precio: 30000
            }
        }),
        prisma.servicio.create({
            data: {
                codigo: 'SERVT1',
                nombre: 'Corte de Tubería a Medida',
                descripcion: 'Dimensionamiento de perfiles y tubos',
                precio: 5000
            }
        }),
    ]);

    console.log('Created servicios:', servicios.length);

    // ═══════════════════════════════════════════════════════════════
    // FINANCIAL ACCOUNTS & MOVEMENTS (NEW SYSTEM)
    // ═══════════════════════════════════════════════════════════════
    console.log('Seeding financial accounts and movements...');

    // Create accounts
    const cajaPrincipal = await prisma.cuentaFinanciera.upsert({
        where: { id: 1 },
        update: { saldoActual: 1892000 },
        create: {
            id: 1,
            nombre: 'Caja Principal',
            tipo: 'caja',
            saldoActual: 1892000
        }
    });

    const bancoGeneral = await prisma.cuentaFinanciera.upsert({
        where: { id: 2 },
        update: { saldoActual: 6100000 },
        create: {
            id: 2,
            nombre: 'Bancolombia Empresarial',
            tipo: 'banco',
            bancoNombre: 'Bancolombia',
            numeroCuenta: '001-987654-21',
            saldoActual: 6100000
        }
    });

    // Clear existing movements first to have a clean test environment
    await prisma.movimientoCaja.deleteMany({});

    // Create sample movements for February (only non-sale movements)
    const baseDate = new Date('2026-02-15T10:00:00');
    const movementsData = [
        { tipo: 'salida', categoria: 'Pago Proveedor', monto: 1200000, cuentaId: bancoGeneral.id, descripcion: 'Pago Distribuidora ABC', diaOffset: 3 }, // Feb 18
        { tipo: 'salida', categoria: 'Gasto Generico', monto: 25000, cuentaId: cajaPrincipal.id, descripcion: 'Almuerzos personal', diaOffset: 5 }, // Feb 20
    ];

    for (const data of movementsData) {
        const fechaMov = new Date(baseDate);
        fechaMov.setDate(baseDate.getDate() + data.diaOffset);

        await prisma.movimientoCaja.create({
            data: {
                tipo: data.tipo,
                categoria: data.categoria,
                monto: data.monto,
                cuentaId: data.cuentaId,
                descripcion: data.descripcion,
                fecha: fechaMov,
                hora: '09:00 AM',
                metodo: data.cuentaId === cajaPrincipal.id ? 'efectivo' : 'banco'
            }
        });
    }

    console.log('Seeded financial movements successfully!');

    // Create default user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.usuario.upsert({
        where: { username: 'admin' },
        update: {
            password: adminPassword,
            role: 'admin'
        },
        create: {
            username: 'admin',
            password: adminPassword,
            role: 'admin'
        }
    });

    // Create default roles
    const defaultRoles = [
        { nombre: 'cajero', descripcion: 'Acceso a POS y caja', permisos: JSON.stringify(['pos', 'historial-ventas', 'caja', 'clientes']) },
        { nombre: 'bodega', descripcion: 'Gestión de inventario y compras', permisos: JSON.stringify(['inventario', 'compras', 'proveedores']) },
        { nombre: 'contador', descripcion: 'Reportes financieros y cuentas', permisos: JSON.stringify(['analisis-financiero', 'historial-ventas', 'cuentas-cobrar', 'cuentas-pagar', 'configuracion']) },
    ];
    for (const role of defaultRoles) {
        await prisma.rol.upsert({
            where: { nombre: role.nombre },
            update: { descripcion: role.descripcion, permisos: role.permisos },
            create: role
        });
    }
    console.log('Seeded default roles successfully!');

    // Create configuracion
    const config = await prisma.configuracion.upsert({
        where: { id: 1 },
        update: {},
        create: {
            nombreEmpresa: 'FERRETERIA LA ESQUINA DEL PROGRESO',
            nit: '19.591.012-2',
            direccion: 'CALLE 9A #10-37',
            telefono: '3014147802',
            email: 'flaesquinadelprogreso@gmail.com',
            moneda: 'COP',
            ivaDefecto: 19
        }
    });

    // Create default resolution
    const resolucion = await prisma.resolucion.upsert({
        where: { numero: '187640000001' },
        update: {},
        create: {
            numero: '187640000001',
            prefijo: 'SETT',
            desde: 1,
            hasta: 1000,
            actual: 5,
            fechaInicio: new Date('2026-01-01'),
            fechaFin: new Date('2027-12-31'),
            activo: true
        }
    });

    // CREATE REAL SALES (Linked to actual products and movements)
    console.log('Creating sample sales...');
    const cliente1 = await prisma.cliente.findFirst({ where: { nombre: 'Juan Perez' } });
    const prod1 = await prisma.producto.findFirst({ where: { nombre: 'Martillo de Uña 16oz' } });
    const prod2 = await prisma.producto.findFirst({ where: { nombre: 'Taladro Percutor 600W' } });

    if (cliente1 && prod1 && prod2) {
        // Venta 1
        const venta1 = await prisma.venta.create({
            data: {
                numeroRecibo: 'SETT1',
                clienteId: cliente1.id,
                subtotal: 151261,
                iva: 28739,
                ivaTasa: 19,
                total: 180000,
                metodoPago: 'efectivo',
                estado: 'completada',
                items: {
                    create: [
                        {
                            productoId: prod1.id,
                            nombre: prod1.nombre,
                            codigo: prod1.codigo,
                            cantidad: 3,
                            precioUnit: 60000,
                            subtotal: 180000,
                            valor_compra_total: (prod1.costo || 45000) * 3,
                            valor_venta_total: 180000,
                            ganancia: 180000 - ((prod1.costo || 45000) * 3),
                            esServicio: false
                        }
                    ]
                }
            }
        });

        // Venta -> Movimiento
        await prisma.movimientoCaja.create({
            data: {
                tipo: 'entrada',
                categoria: 'Venta POS',
                monto: 180000,
                metodo: 'efectivo',
                referencia: 'SETT1',
                descripcion: 'Venta POS - Efectivo',
                fecha: new Date(),
                hora: '10:30 AM',
                ventaId: venta1.id,
                cuentaId: cajaPrincipal.id
            }
        });

        // Venta 2
        const venta2 = await prisma.venta.create({
            data: {
                numeroRecibo: 'SETT2',
                clienteId: cliente1.id,
                subtotal: 100840,
                iva: 19160,
                ivaTasa: 19,
                total: 120000,
                metodoPago: 'banco',
                estado: 'completada',
                items: {
                    create: [
                        {
                            productoId: prod2.id,
                            nombre: prod2.nombre,
                            codigo: prod2.codigo,
                            cantidad: 1,
                            precioUnit: 120000,
                            subtotal: 120000,
                            valor_compra_total: prod2.costo || 85000,
                            valor_venta_total: 120000,
                            ganancia: 120000 - (prod2.costo || 85000),
                            esServicio: false
                        }
                    ]
                }
            }
        });

        await prisma.movimientoCaja.create({
            data: {
                tipo: 'entrada',
                categoria: 'Venta POS',
                monto: 120000,
                metodo: 'banco',
                referencia: 'SETT2',
                descripcion: 'Venta POS - Banco',
                fecha: new Date(),
                hora: '11:45 AM',
                ventaId: venta2.id,
                cuentaId: bancoGeneral.id
            }
        });
    }

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
