-- AlterTable
ALTER TABLE "public"."PO"
ADD COLUMN "vendorAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN "vendorAcknowledgedBy" TEXT,
ADD COLUMN "vendorNote" TEXT;
