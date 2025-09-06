/*
  Warnings:

  - You are about to drop the `bins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_balances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_txns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_lots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."bins" DROP CONSTRAINT "bins_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_balances" DROP CONSTRAINT "inventory_balances_binId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_balances" DROP CONSTRAINT "inventory_balances_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_balances" DROP CONSTRAINT "inventory_balances_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_balances" DROP CONSTRAINT "inventory_balances_lotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_txns" DROP CONSTRAINT "inventory_txns_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_txns" DROP CONSTRAINT "inventory_txns_lotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."item_lots" DROP CONSTRAINT "item_lots_itemId_fkey";

-- DropTable
DROP TABLE "public"."bins";

-- DropTable
DROP TABLE "public"."inventory_balances";

-- DropTable
DROP TABLE "public"."inventory_txns";

-- DropTable
DROP TABLE "public"."item_lots";

-- DropTable
DROP TABLE "public"."items";

-- DropTable
DROP TABLE "public"."locations";

-- CreateTable
CREATE TABLE "public"."Item" (
    "id" BIGSERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "minQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Batch" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "lotNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "qtyOnHand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMove" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "batchId" BIGINT,
    "fromLocId" BIGINT,
    "toLocId" BIGINT,
    "qty" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" BIGINT,
    "eventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Threshold" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "locationId" BIGINT NOT NULL,
    "minQty" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "Threshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_sku_key" ON "public"."Item"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "public"."Location"("name");

-- CreateIndex
CREATE INDEX "Batch_itemId_expiryDate_idx" ON "public"."Batch"("itemId", "expiryDate");

-- CreateIndex
CREATE INDEX "StockMove_itemId_occurredAt_idx" ON "public"."StockMove"("itemId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMove_refType_refId_idx" ON "public"."StockMove"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "Threshold_itemId_locationId_key" ON "public"."Threshold"("itemId", "locationId");

-- AddForeignKey
ALTER TABLE "public"."Batch" ADD CONSTRAINT "Batch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_fromLocId_fkey" FOREIGN KEY ("fromLocId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_toLocId_fkey" FOREIGN KEY ("toLocId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Threshold" ADD CONSTRAINT "Threshold_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Threshold" ADD CONSTRAINT "Threshold_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
