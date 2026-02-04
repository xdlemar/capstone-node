-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED', 'QUARANTINED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "public"."DisposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."Batch" ADD COLUMN "status" "public"."BatchStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "public"."Batch" ADD COLUMN "expiredAt" TIMESTAMP(3);
ALTER TABLE "public"."Batch" ADD COLUMN "quarantinedAt" TIMESTAMP(3);
ALTER TABLE "public"."Batch" ADD COLUMN "disposedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."DisposalRequest" (
    "id" BIGSERIAL NOT NULL,
    "batchId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "fromLocId" BIGINT NOT NULL,
    "status" "public"."DisposalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "disposedAt" TIMESTAMP(3),
    "method" TEXT,
    "witness" TEXT,
    "referenceNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisposalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisposalRequest_status_createdAt_idx" ON "public"."DisposalRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DisposalRequest_batchId_idx" ON "public"."DisposalRequest"("batchId");

-- AddForeignKey
ALTER TABLE "public"."DisposalRequest" ADD CONSTRAINT "DisposalRequest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DisposalRequest" ADD CONSTRAINT "DisposalRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DisposalRequest" ADD CONSTRAINT "DisposalRequest_fromLocId_fkey" FOREIGN KEY ("fromLocId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
