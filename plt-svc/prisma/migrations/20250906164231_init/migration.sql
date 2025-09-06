/*
  Warnings:

  - You are about to drop the `project_tasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."project_tasks" DROP CONSTRAINT "project_tasks_projectId_fkey";

-- DropTable
DROP TABLE "public"."project_tasks";

-- DropTable
DROP TABLE "public"."projects";

-- DropEnum
DROP TYPE "public"."TaskStatus";

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Delivery" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "supplierId" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "trackingNo" TEXT,
    "eta" TIMESTAMP(3),
    "cost" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryEvent" (
    "id" BIGSERIAL NOT NULL,
    "deliveryId" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryPhoto" (
    "id" BIGSERIAL NOT NULL,
    "deliveryId" BIGINT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "public"."Project"("name");

-- CreateIndex
CREATE INDEX "Delivery_status_eta_idx" ON "public"."Delivery"("status", "eta");

-- AddForeignKey
ALTER TABLE "public"."Delivery" ADD CONSTRAINT "Delivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryPhoto" ADD CONSTRAINT "DeliveryPhoto_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
