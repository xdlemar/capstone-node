/*
  Warnings:

  - You are about to drop the `bins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_balances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_txns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_lots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('IN_SERVICE', 'MAINTENANCE', 'RETIRED');

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
CREATE TABLE "public"."assets" (
    "id" BIGSERIAL NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "locationId" BIGINT,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_maint" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_tag_key" ON "public"."assets"("tag");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "public"."assets"("status");

-- CreateIndex
CREATE INDEX "asset_maint_assetId_idx" ON "public"."asset_maint"("assetId");

-- AddForeignKey
ALTER TABLE "public"."asset_maint" ADD CONSTRAINT "asset_maint_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
