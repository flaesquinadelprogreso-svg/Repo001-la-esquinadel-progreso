-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroRecibo" TEXT NOT NULL,
    "clienteId" INTEGER,
    "subtotal" INTEGER NOT NULL,
    "iva" INTEGER NOT NULL,
    "ivaTasa" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'completada',
    "tipo" TEXT NOT NULL DEFAULT 'VENTA',
    "referencia" TEXT,
    "ventaOriginalId" INTEGER,
    "fechaVencimiento" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Venta_ventaOriginalId_fkey" FOREIGN KEY ("ventaOriginalId") REFERENCES "Venta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("clienteId", "createdAt", "estado", "fechaVencimiento", "id", "iva", "ivaTasa", "metodoPago", "numeroRecibo", "subtotal", "total") SELECT "clienteId", "createdAt", "estado", "fechaVencimiento", "id", "iva", "ivaTasa", "metodoPago", "numeroRecibo", "subtotal", "total" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
CREATE UNIQUE INDEX "Venta_numeroRecibo_key" ON "Venta"("numeroRecibo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
