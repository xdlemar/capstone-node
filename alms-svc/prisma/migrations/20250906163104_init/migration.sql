/*
  Warnings:

  - You are about to drop the `asset_maint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."asset_maint" DROP CONSTRAINT "asset_maint_assetId_fkey";

-- DropTable
DROP TABLE "public"."asset_maint";

-- DropTable
DROP TABLE "public"."assets";

-- DropEnum
DROP TYPE "public"."AssetStatus";

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" BIGSERIAL NOT NULL,
    "tagNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" BIGINT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."AssetEvent" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenancePlan" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "rule" TEXT NOT NULL,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceJob" (
    "id" BIGSERIAL NOT NULL,
    "planId" BIGINT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Warranty" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "provider" TEXT,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Disposal" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "method" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tagNo_key" ON "public"."Asset"("tagNo");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "public"."Location"("name");

-- AddForeignKey
ALTER TABLE "public"."Asset" ADD CONSTRAINT "Asset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetEvent" ADD CONSTRAINT "AssetEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceJob" ADD CONSTRAINT "MaintenanceJob_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."MaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Warranty" ADD CONSTRAINT "Warranty_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Disposal" ADD CONSTRAINT "Disposal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
