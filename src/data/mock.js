// ==================== MOCK DATA ====================

export const currentUser = {
    name: 'Carlos Mendoza',
    email: 'carlos@miempresa.com',
    role: 'Administrador',
    avatar: null,
    business: 'Ferretería El Constructor',
};

export const notifications = [
    { id: 1, title: 'Stock bajo', message: 'Cemento Argos está por debajo del mínimo', type: 'warning', time: 'Hace 5 min' },
    { id: 2, title: 'Venta completada', message: 'Venta #1042 por $125,000', type: 'success', time: 'Hace 15 min' },
    { id: 3, title: 'Nuevo cliente', message: 'Juan Pérez se registró', type: 'info', time: 'Hace 1 hora' },
];

export const dashboardStats = [
    { label: 'Ventas Hoy', value: '$1,245,000', change: '+12.5%', trend: 'up', icon: 'TrendingUp' },
    { label: 'Clientes Activos', value: '328', change: '+5.2%', trend: 'up', icon: 'Users' },
    { label: 'Productos', value: '1,204', change: '+2.1%', trend: 'up', icon: 'Package' },
    { label: 'Saldo en Caja', value: '$3,450,000', change: '-3.4%', trend: 'down', icon: 'Wallet' },
];

export const recentTransactions = [
    { id: '#1042', client: 'Juan Pérez', date: '2026-02-21', total: '$125,000', method: 'Efectivo', status: 'Completada' },
    { id: '#1041', client: 'María García', date: '2026-02-21', total: '$89,500', method: 'Transferencia', status: 'Completada' },
    { id: '#1040', client: 'Pedro López', date: '2026-02-21', total: '$245,000', method: 'Tarjeta', status: 'Completada' },
    { id: '#1039', client: 'Ana Rodríguez', date: '2026-02-20', total: '$67,800', method: 'Efectivo', status: 'Completada' },
    { id: '#1038', client: 'Carlos Gómez', date: '2026-02-20', total: '$312,000', method: 'Crédito', status: 'Pendiente' },
];

export const categories = ['Todas', 'Herramientas', 'Materiales', 'Eléctricos', 'Plomería', 'Pinturas', 'Tornillería'];

export const ubicaciones = [
    { id: 1, name: 'Bodega Principal', type: 'Bodega', description: 'Almacén central de productos' },
    { id: 2, name: 'Vitrina 1', type: 'Vitrina', description: 'Exhibición principal - planta baja' },
    { id: 3, name: 'Vitrina 2', type: 'Vitrina', description: 'Exhibición secundaria - segundo piso' },
    { id: 4, name: 'Bodega Norte', type: 'Bodega', description: 'Sucursal Norte - almacén' },
    { id: 5, name: 'Mostrador', type: 'Mostrador', description: 'Productos en punto de venta' },
];

export const bodegas = ['Todas', ...ubicaciones.map(u => u.name)];

export const products = [
    { id: 1, code: 'P001', name: 'Cemento Argos x 50kg', category: 'Materiales', price: 32000, stock: 45, minStock: 20, ubicacion: 'Bodega Principal' },
    { id: 2, code: 'P002', name: 'Martillo Stanley 16oz', category: 'Herramientas', price: 48500, stock: 12, minStock: 5, ubicacion: 'Vitrina 1' },
    { id: 3, code: 'P003', name: 'Cable Eléctrico 12AWG x 100m', category: 'Eléctricos', price: 185000, stock: 3, minStock: 10, ubicacion: 'Bodega Principal' },
    { id: 4, code: 'P004', name: 'Tubo PVC 1/2" x 6m', category: 'Plomería', price: 12500, stock: 80, minStock: 30, ubicacion: 'Bodega Norte' },
    { id: 5, code: 'P005', name: 'Pintura Viniltex Blanca 1gal', category: 'Pinturas', price: 72000, stock: 8, minStock: 15, ubicacion: 'Vitrina 2' },
    { id: 6, code: 'P006', name: 'Tornillo Drywall 6x1" x 100', category: 'Tornillería', price: 8500, stock: 150, minStock: 50, ubicacion: 'Bodega Principal' },
    { id: 7, code: 'P007', name: 'Taladro Percutor Bosch 700W', category: 'Herramientas', price: 289000, stock: 4, minStock: 3, ubicacion: 'Mostrador' },
    { id: 8, code: 'P008', name: 'Cinta Aislante 3M 20m', category: 'Eléctricos', price: 5200, stock: 60, minStock: 20, ubicacion: 'Bodega Principal' },
    { id: 9, code: 'P009', name: 'Llave Inglesa 10"', category: 'Herramientas', price: 35000, stock: 7, minStock: 5, ubicacion: 'Vitrina 1' },
    { id: 10, code: 'P010', name: 'Arena Lavada x Bulto', category: 'Materiales', price: 18000, stock: 2, minStock: 10, ubicacion: 'Bodega Norte' },
    { id: 11, code: 'P011', name: 'Interruptor Doble Leviton', category: 'Eléctricos', price: 14500, stock: 25, minStock: 10, ubicacion: 'Vitrina 2' },
    { id: 12, code: 'P012', name: 'Lija de Agua #150', category: 'Pinturas', price: 2800, stock: 90, minStock: 30, ubicacion: 'Mostrador' },
];

export const clients = [
    { id: 1, name: 'Juan Pérez', document: '1234567890', phone: '310-555-0101', email: 'juan@email.com', totalPurchases: '$2,450,000', lastPurchase: '2026-02-21' },
    { id: 2, name: 'María García', document: '0987654321', phone: '320-555-0202', email: 'maria@email.com', totalPurchases: '$1,890,000', lastPurchase: '2026-02-20' },
    { id: 3, name: 'Pedro López', document: '5678901234', phone: '315-555-0303', email: 'pedro@email.com', totalPurchases: '$3,120,000', lastPurchase: '2026-02-19' },
    { id: 4, name: 'Ana Rodríguez', document: '3456789012', phone: '300-555-0404', email: 'ana@email.com', totalPurchases: '$890,000', lastPurchase: '2026-02-18' },
    { id: 5, name: 'Carlos Gómez', document: '7890123456', phone: '318-555-0505', email: 'carlos.g@email.com', totalPurchases: '$5,670,000', lastPurchase: '2026-02-17' },
];

export const suppliers = [
    { id: 1, name: 'Distribuidora ABC', nit: '900123456-1', phone: '601-555-0001', email: 'ventas@abc.com', city: 'Bogotá', totalOrders: 45, lastOrder: '2026-02-15' },
    { id: 2, name: 'Materiales del Valle', nit: '800456789-2', phone: '602-555-0002', email: 'info@mvalley.com', city: 'Cali', totalOrders: 32, lastOrder: '2026-02-18' },
    { id: 3, name: 'Herramientas Pro', nit: '700789012-3', phone: '604-555-0003', email: 'pedidos@hpro.com', city: 'Medellín', totalOrders: 28, lastOrder: '2026-02-20' },
    { id: 4, name: 'Eléctricos del Norte', nit: '600345678-4', phone: '605-555-0004', email: 'norte@elec.com', city: 'Barranquilla', totalOrders: 15, lastOrder: '2026-02-10' },
];

export const purchases = [
    { id: 'C001', supplier: 'Distribuidora ABC', date: '2026-02-20', items: 5, total: '$1,250,000', status: 'Recibida' },
    { id: 'C002', supplier: 'Herramientas Pro', date: '2026-02-18', items: 3, total: '$890,000', status: 'Recibida' },
    { id: 'C003', supplier: 'Materiales del Valle', date: '2026-02-15', items: 8, total: '$2,340,000', status: 'Pendiente' },
    { id: 'C004', supplier: 'Eléctricos del Norte', date: '2026-02-12', items: 4, total: '$567,000', status: 'Recibida' },
];

export const cashRegister = {
    isOpen: true,
    openedAt: '2026-02-21 08:00',
    openedBy: 'Carlos Mendoza',
    initialBalance: 200000,
    currentBalance: 3450000,
    sales: 3250000,
    expenses: 0,
    transactions: [
        { id: 1, type: 'Venta', ref: '#1042', amount: 125000, method: 'Efectivo', time: '09:15' },
        { id: 2, type: 'Venta', ref: '#1041', amount: 89500, method: 'Transferencia', time: '10:30' },
        { id: 3, type: 'Venta', ref: '#1040', amount: 245000, method: 'Tarjeta', time: '11:45' },
        { id: 4, type: 'Venta', ref: '#1039', amount: 67800, method: 'Efectivo', time: '13:20' },
        { id: 5, type: 'Venta', ref: '#1038', amount: 312000, method: 'Efectivo', time: '14:50' },
    ],
};

export const roles = [
    { id: 1, name: 'Administrador', description: 'Acceso total al sistema', usersCount: 2 },
    { id: 2, name: 'Cajero', description: 'Acceso a POS y caja', usersCount: 3 },
    { id: 3, name: 'Inventario', description: 'Gestión de productos y stock', usersCount: 1 },
    { id: 4, name: 'Contador', description: 'Reportes y configuración financiera', usersCount: 1 },
];

export const permissions = [
    { id: 1, module: 'Inventario', label: 'Ver inventario', action: 'inventario.ver' },
    { id: 2, module: 'Inventario', label: 'Crear productos', action: 'inventario.crear' },
    { id: 3, module: 'Inventario', label: 'Editar productos', action: 'inventario.editar' },
    { id: 4, module: 'POS', label: 'Ver POS', action: 'pos.ver' },
    { id: 5, module: 'POS', label: 'Realizar ventas', action: 'pos.vender' },
    { id: 6, module: 'POS', label: 'Anular ventas', action: 'pos.anular' },
    { id: 7, module: 'Caja', label: 'Ver caja', action: 'caja.ver' },
    { id: 8, module: 'Caja', label: 'Abrir caja', action: 'caja.abrir' },
    { id: 9, module: 'Caja', label: 'Cerrar caja', action: 'caja.cerrar' },
    { id: 10, module: 'Reportes', label: 'Ver reportes', action: 'reportes.ver' },
    { id: 11, module: 'Reportes', label: 'Exportar reportes', action: 'reportes.exportar' },
    { id: 12, module: 'Configuración', label: 'Ver configuración', action: 'config.ver' },
    { id: 13, module: 'Configuración', label: 'Editar configuración', action: 'config.editar' },
];

export const rolePermissions = [
    { roleId: 1, permissionId: 1, granted: true }, { roleId: 1, permissionId: 2, granted: true },
    { roleId: 1, permissionId: 3, granted: true }, { roleId: 1, permissionId: 4, granted: true },
    { roleId: 1, permissionId: 5, granted: true }, { roleId: 1, permissionId: 6, granted: true },
    { roleId: 1, permissionId: 7, granted: true }, { roleId: 1, permissionId: 8, granted: true },
    { roleId: 1, permissionId: 9, granted: true }, { roleId: 1, permissionId: 10, granted: true },
    { roleId: 1, permissionId: 11, granted: true }, { roleId: 1, permissionId: 12, granted: true },
    { roleId: 1, permissionId: 13, granted: true },
    { roleId: 2, permissionId: 4, granted: true }, { roleId: 2, permissionId: 5, granted: true },
    { roleId: 2, permissionId: 7, granted: true }, { roleId: 2, permissionId: 8, granted: true },
    { roleId: 2, permissionId: 9, granted: true },
    { roleId: 3, permissionId: 1, granted: true }, { roleId: 3, permissionId: 2, granted: true },
    { roleId: 3, permissionId: 3, granted: true },
    { roleId: 4, permissionId: 10, granted: true }, { roleId: 4, permissionId: 11, granted: true },
    { roleId: 4, permissionId: 12, granted: true },
];


export const whatsappConfig = {
    apiConnected: true,
    phoneNumber: '+57 310 555 0000',
    webhookUrl: 'https://api.miempresa.com/webhook/whatsapp',
    webhookStatus: 'active',
    templates: [
        { id: 1, name: 'Bienvenida', message: 'Hola {{nombre}}, bienvenido a {{empresa}}. ¿En qué podemos ayudarte?', status: 'Activa' },
        { id: 2, name: 'Confirmación de pedido', message: 'Tu pedido #{{pedido}} por {{total}} ha sido confirmado.', status: 'Activa' },
        { id: 3, name: 'Recordatorio de pago', message: 'Hola {{nombre}}, tienes un saldo pendiente de {{saldo}}.', status: 'Inactiva' },
    ],
    recentMessages: [
        { id: 1, to: '+57 310 555 0101', template: 'Confirmación de pedido', date: '2026-02-21 09:30', status: 'Enviado' },
        { id: 2, to: '+57 320 555 0202', template: 'Bienvenida', date: '2026-02-21 10:15', status: 'Enviado' },
        { id: 3, to: '+57 315 555 0303', template: 'Recordatorio de pago', date: '2026-02-20 14:00', status: 'Fallido' },
    ],
};

export const reportData = {
    salesByMonth: [
        { month: 'Sep', value: 8500000 },
        { month: 'Oct', value: 9200000 },
        { month: 'Nov', value: 7800000 },
        { month: 'Dic', value: 12400000 },
        { month: 'Ene', value: 10100000 },
        { month: 'Feb', value: 11300000 },
    ],
    topProducts: [
        { name: 'Cemento Argos', qty: 320, revenue: '$10,240,000' },
        { name: 'Taladro Bosch', qty: 28, revenue: '$8,092,000' },
        { name: 'Pintura Viniltex', qty: 95, revenue: '$6,840,000' },
        { name: 'Cable 12AWG', qty: 42, revenue: '$7,770,000' },
        { name: 'Martillo Stanley', qty: 65, revenue: '$3,152,500' },
    ],
    summary: {
        totalSales: '$59,300,000',
        totalPurchases: '$32,100,000',
        grossProfit: '$27,200,000',
        avgTicket: '$185,000',
    },
};
