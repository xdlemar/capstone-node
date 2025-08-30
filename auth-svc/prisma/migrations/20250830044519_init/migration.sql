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
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'STAFF', 'IT');

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
CREATE TABLE "public"."users" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'STAFF',
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");
