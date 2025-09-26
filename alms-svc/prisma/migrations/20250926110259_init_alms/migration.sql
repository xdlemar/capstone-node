-- AlterTable
ALTER TABLE "public"."AssetDepreciation" ADD COLUMN     "lastPostedPeriod" TIMESTAMP(3);

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
CREATE INDEX "AssetFinancialSnapshot_periodStart_idx" ON "public"."AssetFinancialSnapshot"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AssetFinancialSnapshot_assetId_periodStart_key" ON "public"."AssetFinancialSnapshot"("assetId", "periodStart");

-- AddForeignKey
ALTER TABLE "public"."AssetFinancialSnapshot" ADD CONSTRAINT "AssetFinancialSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
