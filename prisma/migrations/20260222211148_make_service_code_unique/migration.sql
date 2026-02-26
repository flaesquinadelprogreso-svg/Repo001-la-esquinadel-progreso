/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `Servicio` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Servicio_codigo_key" ON "Servicio"("codigo");
