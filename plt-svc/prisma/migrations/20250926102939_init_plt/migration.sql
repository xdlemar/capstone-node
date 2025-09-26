-- CreateEnum
CREATE TYPE "public"."DeliveryAlertType" AS ENUM ('STATUS_DELAY', 'ETA_MISSED');

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

-- CreateIndex
CREATE INDEX "DeliveryAlert_deliveryId_resolvedAt_idx" ON "public"."DeliveryAlert"("deliveryId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "public"."DeliveryAlert" ADD CONSTRAINT "DeliveryAlert_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
