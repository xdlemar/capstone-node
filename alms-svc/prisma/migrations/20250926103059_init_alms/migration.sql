-- CreateEnum
CREATE TYPE "public"."MaintenanceAlertType" AS ENUM ('OVERDUE_MAINTENANCE', 'WARRANTY_EXPIRING');

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

-- CreateIndex
CREATE INDEX "MaintenanceAlert_assetId_resolvedAt_idx" ON "public"."MaintenanceAlert"("assetId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."MaintenanceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
