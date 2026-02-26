-- CreateTable
CREATE TABLE "Resolucion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "prefijo" TEXT,
    "desde" INTEGER NOT NULL,
    "hasta" INTEGER NOT NULL,
    "actual" INTEGER NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Resolucion_numero_key" ON "Resolucion"("numero");
