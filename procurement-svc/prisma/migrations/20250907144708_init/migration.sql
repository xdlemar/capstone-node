/*
  Warnings:

  - A unique constraint covering the columns `[poId,invoiceNo]` on the table `Receipt` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Receipt_poId_invoiceNo_key" ON "public"."Receipt"("poId", "invoiceNo");
