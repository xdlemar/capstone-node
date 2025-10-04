-- CreateEnum
CREATE TYPE "public"."DeliveryStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'DELAYED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DeliveryAlertType" AS ENUM ('STATUS_DELAY', 'ETA_MISSED');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "managerId" BIGINT,
    "budget" DECIMAL(65,30),
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Delivery" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "poId" BIGINT,
    "vendorId" BIGINT,
    "status" "public"."DeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "trackingNo" TEXT,
    "eta" TIMESTAMP(3),
    "departedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "lastKnown" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryAlert" (
    "id" BIGSERIAL NOT NULL,
    "deliveryId" BIGINT NOT NULL,
    "type" "public"."DeliveryAlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryAlert_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "public"."DeliveryPhoto" (
    "id" BIGSERIAL NOT NULL,
    "deliveryId" BIGINT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryPhoto_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Project_code_key" ON "public"."Project"("code");

-- CreateIndex
CREATE INDEX "Delivery_projectId_status_idx" ON "public"."Delivery"("projectId", "status");

-- CreateIndex
CREATE INDEX "DeliveryAlert_deliveryId_resolvedAt_idx" ON "public"."DeliveryAlert"("deliveryId", "resolvedAt");

-- CreateIndex
CREATE INDEX "DeliveryUpdate_deliveryId_occurredAt_idx" ON "public"."DeliveryUpdate"("deliveryId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProjectMaterialAlloc_itemId_idx" ON "public"."ProjectMaterialAlloc"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMaterialAlloc_projectId_itemId_key" ON "public"."ProjectMaterialAlloc"("projectId", "itemId");

-- CreateIndex
CREATE INDEX "ProjectCost_projectId_occurredAt_idx" ON "public"."ProjectCost"("projectId", "occurredAt");

-- AddForeignKey
ALTER TABLE "public"."Delivery" ADD CONSTRAINT "Delivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryAlert" ADD CONSTRAINT "DeliveryAlert_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryUpdate" ADD CONSTRAINT "DeliveryUpdate_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryPhoto" ADD CONSTRAINT "DeliveryPhoto_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMaterialAlloc" ADD CONSTRAINT "ProjectMaterialAlloc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectCost" ADD CONSTRAINT "ProjectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
