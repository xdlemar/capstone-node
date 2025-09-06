/*
  Warnings:

  - You are about to drop the column `receivedBy` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the `FileObject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `POItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PRItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Supplier` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Receipt` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."PRStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."POStatus" AS ENUM ('OPEN', 'PARTIAL', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "public"."FileObject" DROP CONSTRAINT "FileObject_receiptId_fkey";

-- DropForeignKey
ALTER TABLE "public"."POItem" DROP CONSTRAINT "POItem_poId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PRItem" DROP CONSTRAINT "PRItem_prId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Receipt" DROP CONSTRAINT "Receipt_poId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReceiptItem" DROP CONSTRAINT "ReceiptItem_poItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReceiptItem" DROP CONSTRAINT "ReceiptItem_receiptId_fkey";

-- AlterTable
ALTER TABLE "public"."Receipt" DROP COLUMN "receivedBy",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "drNo" TEXT,
ADD COLUMN     "invoiceNo" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "public"."FileObject";

-- DropTable
DROP TABLE "public"."POItem";

-- DropTable
DROP TABLE "public"."PRItem";

-- DropTable
DROP TABLE "public"."PurchaseOrder";

-- DropTable
DROP TABLE "public"."PurchaseRequest";

-- DropTable
DROP TABLE "public"."ReceiptItem";

-- DropTable
DROP TABLE "public"."Supplier";

-- CreateTable
CREATE TABLE "public"."Vendor" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PR" (
    "id" BIGSERIAL NOT NULL,
    "prNo" TEXT NOT NULL,
    "status" "public"."PRStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PRLine" (
    "id" BIGSERIAL NOT NULL,
    "prId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PRLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PO" (
    "id" BIGSERIAL NOT NULL,
    "poNo" TEXT NOT NULL,
    "prId" BIGINT,
    "vendorId" BIGINT NOT NULL,
    "status" "public"."POStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."POLine" (
    "id" BIGSERIAL NOT NULL,
    "poId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "POLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReceiptLine" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "toLocId" BIGINT NOT NULL,
    "qty" INTEGER NOT NULL,
    "lotNo" TEXT,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "ReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "public"."Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PR_prNo_key" ON "public"."PR"("prNo");

-- CreateIndex
CREATE UNIQUE INDEX "PO_poNo_key" ON "public"."PO"("poNo");

-- AddForeignKey
ALTER TABLE "public"."PRLine" ADD CONSTRAINT "PRLine_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PR"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PO" ADD CONSTRAINT "PO_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PO" ADD CONSTRAINT "PO_prId_fkey" FOREIGN KEY ("prId") REFERENCES "public"."PR"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."POLine" ADD CONSTRAINT "POLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Receipt" ADD CONSTRAINT "Receipt_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReceiptLine" ADD CONSTRAINT "ReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "public"."Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
