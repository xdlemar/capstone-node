/*
  Warnings:

  - You are about to drop the column `cost` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `Delivery` table. All the data in the column will be lost.
  - The `status` column on the `Delivery` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `DeliveryPhoto` table. All the data in the column will be lost.
  - You are about to drop the column `fileKey` on the `DeliveryPhoto` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `DeliveryEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileName` to the `DeliveryPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `DeliveryPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DeliveryStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'DELAYED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "public"."DeliveryEvent" DROP CONSTRAINT "DeliveryEvent_deliveryId_fkey";

-- DropIndex
DROP INDEX "public"."Delivery_status_eta_idx";

-- DropIndex
DROP INDEX "public"."Project_name_key";

-- AlterTable
ALTER TABLE "public"."Delivery" DROP COLUMN "cost",
DROP COLUMN "supplierId",
ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "lastKnown" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "poId" BIGINT,
ADD COLUMN     "vendorId" BIGINT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."DeliveryStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "public"."DeliveryPhoto" DROP COLUMN "createdAt",
DROP COLUMN "fileKey",
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "storageKey" TEXT NOT NULL,
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Project" DROP COLUMN "ownerId",
ADD COLUMN     "budget" DECIMAL(65,30),
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "endsOn" TIMESTAMP(3),
ADD COLUMN     "managerId" BIGINT,
ADD COLUMN     "startsOn" TIMESTAMP(3),
ADD COLUMN     "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNING';

-- DropTable
DROP TABLE "public"."DeliveryEvent";

-- CreateTable
CREATE TABLE "public"."DeliveryUpdate" (
    "id" BIGSERIAL NOT NULL,
    "deliveryId" BIGINT NOT NULL,
    "status" "public"."DeliveryStatus" NOT NULL,
    "message" TEXT,
    "place" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectMaterialAlloc" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qtyPlanned" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "qtyIssued" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ProjectMaterialAlloc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectCost" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" BIGINT,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryUpdate_deliveryId_occurredAt_idx" ON "public"."DeliveryUpdate"("deliveryId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProjectMaterialAlloc_itemId_idx" ON "public"."ProjectMaterialAlloc"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMaterialAlloc_projectId_itemId_key" ON "public"."ProjectMaterialAlloc"("projectId", "itemId");

-- CreateIndex
CREATE INDEX "ProjectCost_projectId_occurredAt_idx" ON "public"."ProjectCost"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "Delivery_projectId_status_idx" ON "public"."Delivery"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "public"."Project"("code");

-- AddForeignKey
ALTER TABLE "public"."DeliveryUpdate" ADD CONSTRAINT "DeliveryUpdate_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMaterialAlloc" ADD CONSTRAINT "ProjectMaterialAlloc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectCost" ADD CONSTRAINT "ProjectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
