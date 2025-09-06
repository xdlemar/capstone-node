/*
  Warnings:

  - You are about to drop the `grn_lines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `grns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `purchase_order_lines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `purchase_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `suppliers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."grn_lines" DROP CONSTRAINT "grn_lines_grnId_fkey";

-- DropForeignKey
ALTER TABLE "public"."grn_lines" DROP CONSTRAINT "grn_lines_poLineId_fkey";

-- DropForeignKey
ALTER TABLE "public"."grns" DROP CONSTRAINT "grns_poId_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchase_order_lines" DROP CONSTRAINT "purchase_order_lines_poId_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchase_orders" DROP CONSTRAINT "purchase_orders_supplierId_fkey";

-- DropTable
DROP TABLE "public"."grn_lines";

-- DropTable
DROP TABLE "public"."grns";

-- DropTable
DROP TABLE "public"."purchase_order_lines";

-- DropTable
DROP TABLE "public"."purchase_orders";

-- DropTable
DROP TABLE "public"."suppliers";

-- CreateTable
CREATE TABLE "public"."Supplier" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseRequest" (
    "id" BIGSERIAL NOT NULL,
    "requesterId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "neededBy" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PRItem" (
    "id" BIGSERIAL NOT NULL,
    "prId" BIGINT NOT NULL,
    "itemSku" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "PRItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrder" (
    "id" BIGSERIAL NOT NULL,
    "supplierId" BIGINT NOT NULL,
    "prId" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "approvedBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."POItem" (
    "id" BIGSERIAL NOT NULL,
    "poId" BIGINT NOT NULL,
    "itemSku" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "POItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Receipt" (
    "id" BIGSERIAL NOT NULL,
    "poId" BIGINT NOT NULL,
    "receivedBy" BIGINT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReceiptItem" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT NOT NULL,
    "poItemId" BIGINT NOT NULL,
    "qtyReceived" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FileObject" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "public"."Supplier"("name");

-- AddForeignKey
ALTER TABLE "public"."PRItem" ADD CONSTRAINT "PRItem_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."POItem" ADD CONSTRAINT "POItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Receipt" ADD CONSTRAINT "Receipt_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "public"."Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReceiptItem" ADD CONSTRAINT "ReceiptItem_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "public"."POItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FileObject" ADD CONSTRAINT "FileObject_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "public"."Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
