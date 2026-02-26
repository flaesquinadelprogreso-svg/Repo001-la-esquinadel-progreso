/*
  Warnings:

  - You are about to drop the `Caja` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Caja";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CuentaFinanciera" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "saldoActual" INTEGER NOT NULL DEFAULT 0,
    "bancoNombre" TEXT,
    "numeroCuenta" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MovimientoCaja" (
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
    "ventaId" INTEGER,
    "abonoCobroId" INTEGER,
    "abonoPagoId" INTEGER,
    CONSTRAINT "MovimientoCaja_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaFinanciera" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoCaja_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoCaja_abonoCobroId_fkey" FOREIGN KEY ("abonoCobroId") REFERENCES "AbonoCobro" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoCaja_abonoPagoId_fkey" FOREIGN KEY ("abonoPagoId") REFERENCES "AbonoPago" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MovimientoCaja" ("abonoCobroId", "abonoPagoId", "categoria", "descripcion", "fecha", "hora", "id", "metodo", "monto", "referencia", "tipo", "ventaId") SELECT "abonoCobroId", "abonoPagoId", "categoria", "descripcion", "fecha", "hora", "id", "metodo", "monto", "referencia", "tipo", "ventaId" FROM "MovimientoCaja";
DROP TABLE "MovimientoCaja";
ALTER TABLE "new_MovimientoCaja" RENAME TO "MovimientoCaja";
CREATE UNIQUE INDEX "MovimientoCaja_ventaId_key" ON "MovimientoCaja"("ventaId");
CREATE UNIQUE INDEX "MovimientoCaja_abonoCobroId_key" ON "MovimientoCaja"("abonoCobroId");
CREATE UNIQUE INDEX "MovimientoCaja_abonoPagoId_key" ON "MovimientoCaja"("abonoPagoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CuentaFinanciera_nombre_key" ON "CuentaFinanciera"("nombre");
