-- DropIndex
DROP INDEX "MovimientoCaja_ventaId_key";

-- CreateTable
CREATE TABLE "Devolucion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "clienteId" INTEGER,
    "numeroDevolucion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT,
    "subtotal" INTEGER NOT NULL,
    "iva" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "metodoReembolso" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'completada',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Devolucion_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Devolucion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemDevolucion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "devolucionId" INTEGER NOT NULL,
    "itemVentaId" INTEGER NOT NULL,
    "productoId" INTEGER,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "esServicio" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ItemDevolucion_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "Devolucion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemDevolucion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimientoCajaDevolucion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "descripcion" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora" TEXT NOT NULL,
    "cuentaId" INTEGER,
    "devolucionId" INTEGER NOT NULL,
    CONSTRAINT "MovimientoCajaDevolucion_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaFinanciera" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoCajaDevolucion_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "Devolucion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CierreCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cuentaId" INTEGER NOT NULL,
    "fechaApertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" DATETIME,
    "saldoInicial" REAL NOT NULL DEFAULT 0,
    "saldoTeorico" REAL NOT NULL DEFAULT 0,
    "saldoReal" REAL NOT NULL DEFAULT 0,
    "diferencia" REAL NOT NULL DEFAULT 0,
    "totalIngresos" REAL NOT NULL DEFAULT 0,
    "totalEgresos" REAL NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    CONSTRAINT "CierreCaja_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaFinanciera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Compra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroFactura" TEXT,
    "tipoDocumento" TEXT DEFAULT 'OC - 1 - Orden de compra',
    "fechaElaboracion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedorId" INTEGER,
    "contacto" TEXT,
    "centroCosto" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "proveedorPorItem" BOOLEAN NOT NULL DEFAULT false,
    "impuestosIncluidos" BOOLEAN NOT NULL DEFAULT false,
    "descuentoPorcentaje" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" INTEGER NOT NULL,
    "descuentoGlobal" INTEGER NOT NULL DEFAULT 0,
    "iva" INTEGER NOT NULL,
    "reteIva" INTEGER NOT NULL DEFAULT 0,
    "reteIca" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'recibida',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Compra" ("createdAt", "estado", "id", "iva", "numeroFactura", "proveedorId", "subtotal", "total") SELECT "createdAt", "estado", "id", "iva", "numeroFactura", "proveedorId", "subtotal", "total" FROM "Compra";
DROP TABLE "Compra";
ALTER TABLE "new_Compra" RENAME TO "Compra";
CREATE TABLE "new_ItemCompra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "compraId" INTEGER NOT NULL,
    "tipoItem" TEXT NOT NULL DEFAULT 'Producto',
    "productoId" INTEGER,
    "ubicacionId" INTEGER,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" INTEGER NOT NULL,
    "descuento" INTEGER NOT NULL DEFAULT 0,
    "baseAiu" INTEGER NOT NULL DEFAULT 0,
    "impCargo" INTEGER NOT NULL DEFAULT 0,
    "impoconsumo" INTEGER NOT NULL DEFAULT 0,
    "impRetencion" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,
    CONSTRAINT "ItemCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ItemCompra_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ItemCompra" ("cantidad", "codigo", "compraId", "id", "nombre", "precioUnit", "productoId", "subtotal") SELECT "cantidad", "codigo", "compraId", "id", "nombre", "precioUnit", "productoId", "subtotal" FROM "ItemCompra";
DROP TABLE "ItemCompra";
ALTER TABLE "new_ItemCompra" RENAME TO "ItemCompra";
CREATE TABLE "new_ItemVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER,
    "servicioId" INTEGER,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidadDevuelta" INTEGER NOT NULL DEFAULT 0,
    "precioUnit" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "esServicio" BOOLEAN NOT NULL DEFAULT false,
    "locationId" INTEGER,
    "costo_unitario_ponderado" INTEGER,
    "valor_compra_total" INTEGER,
    "valor_venta_total" INTEGER,
    "ganancia" INTEGER,
    CONSTRAINT "ItemVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemVenta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ItemVenta_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ItemVenta_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Ubicacion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ItemVenta" ("cantidad", "codigo", "esServicio", "id", "locationId", "nombre", "precioUnit", "productoId", "servicioId", "subtotal", "ventaId") SELECT "cantidad", "codigo", "esServicio", "id", "locationId", "nombre", "precioUnit", "productoId", "servicioId", "subtotal", "ventaId" FROM "ItemVenta";
DROP TABLE "ItemVenta";
ALTER TABLE "new_ItemVenta" RENAME TO "ItemVenta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Devolucion_numeroDevolucion_key" ON "Devolucion"("numeroDevolucion");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoCajaDevolucion_devolucionId_key" ON "MovimientoCajaDevolucion"("devolucionId");
