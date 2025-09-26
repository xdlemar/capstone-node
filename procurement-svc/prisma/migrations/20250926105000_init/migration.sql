-- AlterTable
ALTER TABLE "public"."PO" ADD COLUMN     "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Receipt" ADD COLUMN     "arrivalDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."VendorMetric" (
    "id" BIGSERIAL NOT NULL,
    "vendorId" BIGINT NOT NULL,
    "onTimePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgLeadTimeDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fulfillmentRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpend" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorMetric_vendorId_key" ON "public"."VendorMetric"("vendorId");

-- AddForeignKey
ALTER TABLE "public"."VendorMetric" ADD CONSTRAINT "VendorMetric_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
