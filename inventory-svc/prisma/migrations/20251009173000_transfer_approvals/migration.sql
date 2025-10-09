-- Alter Transfer to support approval workflow
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Transfer"
  ADD COLUMN "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "requestedBy" TEXT,
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

-- Existing transfers are considered already approved
UPDATE "Transfer" SET "status" = 'APPROVED' WHERE "status" IS NULL;
