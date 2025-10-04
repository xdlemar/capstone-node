-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "public"."MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'CALIBRATION');

-- CreateEnum
CREATE TYPE "public"."WorkOrderStatus" AS ENUM ('OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'NONE');

-- CreateEnum
CREATE TYPE "public"."MaintenanceAlertType" AS ENUM ('OVERDUE_MAINTENANCE', 'WARRANTY_EXPIRING');

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" BIGSERIAL NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "itemId" BIGINT,
    "serialNo" TEXT,
    "category" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(65,30),
    "vendorId" BIGINT,
    "warrantyUntil" TIMESTAMP(3),
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "locationId" BIGINT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssetDepreciation" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "method" "public"."DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "lifeMonths" INTEGER,
    "salvage" DECIMAL(65,30),
    "startedAt" TIMESTAMP(3),
    "accumulated" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastPostedPeriod" TIMESTAMP(3),

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

-- CreateTable
CREATE TABLE "public"."MaintenanceAlert" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "scheduleId" BIGINT,
    "type" "public"."MaintenanceAlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssetFinancialSnapshot" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "depreciation" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "maintenanceCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bookValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetFinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "public"."Asset"("assetCode");

-- CreateIndex
CREATE INDEX "Asset_serialNo_idx" ON "public"."Asset"("serialNo");

-- CreateIndex
CREATE INDEX "Asset_locationId_idx" ON "public"."Asset"("locationId");

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
CREATE INDEX "MaintenanceAlert_assetId_resolvedAt_idx" ON "public"."MaintenanceAlert"("assetId", "resolvedAt");

-- CreateIndex
CREATE INDEX "AssetFinancialSnapshot_periodStart_idx" ON "public"."AssetFinancialSnapshot"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AssetFinancialSnapshot_assetId_periodStart_key" ON "public"."AssetFinancialSnapshot"("assetId", "periodStart");

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

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."MaintenanceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetFinancialSnapshot" ADD CONSTRAINT "AssetFinancialSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
