/*
  Warnings:

  - You are about to drop the column `name` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseCost` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `tagNo` on the `Asset` table. All the data in the column will be lost.
  - The `status` column on the `Asset` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AssetEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Disposal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaintenanceJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaintenancePlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Warranty` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[assetCode]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assetCode` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "public"."MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'CALIBRATION');

-- CreateEnum
CREATE TYPE "public"."WorkOrderStatus" AS ENUM ('OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'NONE');

-- DropForeignKey
ALTER TABLE "public"."Asset" DROP CONSTRAINT "Asset_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssetEvent" DROP CONSTRAINT "AssetEvent_assetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Disposal" DROP CONSTRAINT "Disposal_assetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaintenanceJob" DROP CONSTRAINT "MaintenanceJob_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaintenancePlan" DROP CONSTRAINT "MaintenancePlan_assetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Warranty" DROP CONSTRAINT "Warranty_assetId_fkey";

-- DropIndex
DROP INDEX "public"."Asset_tagNo_key";

-- AlterTable
ALTER TABLE "public"."Asset" DROP COLUMN "name",
DROP COLUMN "purchaseCost",
DROP COLUMN "tagNo",
ADD COLUMN     "acquisitionCost" DECIMAL(65,30),
ADD COLUMN     "assetCode" TEXT NOT NULL,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "itemId" BIGINT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "serialNo" TEXT,
ADD COLUMN     "vendorId" BIGINT,
ADD COLUMN     "warrantyUntil" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AssetStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "public"."AssetEvent";

-- DropTable
DROP TABLE "public"."Disposal";

-- DropTable
DROP TABLE "public"."Location";

-- DropTable
DROP TABLE "public"."MaintenanceJob";

-- DropTable
DROP TABLE "public"."MaintenancePlan";

-- DropTable
DROP TABLE "public"."Warranty";

-- CreateTable
CREATE TABLE "public"."AssetDepreciation" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "method" "public"."DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "lifeMonths" INTEGER,
    "salvage" DECIMAL(65,30),
    "startedAt" TIMESTAMP(3),
    "accumulated" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "AssetDepreciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceSchedule" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "type" "public"."MaintenanceType" NOT NULL,
    "intervalDays" INTEGER,
    "nextDue" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceWorkOrder" (
    "id" BIGSERIAL NOT NULL,
    "woNo" TEXT NOT NULL,
    "assetId" BIGINT NOT NULL,
    "type" "public"."MaintenanceType" NOT NULL,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "technician" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RepairLog" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "woId" BIGINT,
    "description" TEXT NOT NULL,
    "repairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "RepairLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssetTransfer" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "fromLocId" BIGINT,
    "toLocId" BIGINT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "AssetTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssetDisposal" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "proceeds" DECIMAL(65,30),
    "approvedById" BIGINT,

    CONSTRAINT "AssetDisposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciation_assetId_key" ON "public"."AssetDepreciation"("assetId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_assetId_nextDue_idx" ON "public"."MaintenanceSchedule"("assetId", "nextDue");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceWorkOrder_woNo_key" ON "public"."MaintenanceWorkOrder"("woNo");

-- CreateIndex
CREATE INDEX "MaintenanceWorkOrder_assetId_status_idx" ON "public"."MaintenanceWorkOrder"("assetId", "status");

-- CreateIndex
CREATE INDEX "RepairLog_assetId_repairedAt_idx" ON "public"."RepairLog"("assetId", "repairedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDisposal_assetId_key" ON "public"."AssetDisposal"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "public"."Asset"("assetCode");

-- CreateIndex
CREATE INDEX "Asset_serialNo_idx" ON "public"."Asset"("serialNo");

-- CreateIndex
CREATE INDEX "Asset_locationId_idx" ON "public"."Asset"("locationId");

-- AddForeignKey
ALTER TABLE "public"."AssetDepreciation" ADD CONSTRAINT "AssetDepreciation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RepairLog" ADD CONSTRAINT "RepairLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RepairLog" ADD CONSTRAINT "RepairLog_woId_fkey" FOREIGN KEY ("woId") REFERENCES "public"."MaintenanceWorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetTransfer" ADD CONSTRAINT "AssetTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetDisposal" ADD CONSTRAINT "AssetDisposal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
