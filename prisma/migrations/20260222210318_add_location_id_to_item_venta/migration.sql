-- DropIndex
DROP INDEX "Servicio_codigo_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItemVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER,
    "servicioId" INTEGER,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "esServicio" BOOLEAN NOT NULL DEFAULT false,
    "locationId" INTEGER,
    CONSTRAINT "ItemVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemVenta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ItemVenta_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ItemVenta_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Ubicacion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ItemVenta" ("cantidad", "codigo", "esServicio", "id", "nombre", "precioUnit", "productoId", "servicioId", "subtotal", "ventaId") SELECT "cantidad", "codigo", "esServicio", "id", "nombre", "precioUnit", "productoId", "servicioId", "subtotal", "ventaId" FROM "ItemVenta";
DROP TABLE "ItemVenta";
ALTER TABLE "new_ItemVenta" RENAME TO "ItemVenta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
