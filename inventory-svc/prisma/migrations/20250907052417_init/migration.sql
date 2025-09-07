-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('LOW_STOCK', 'EXPIRY');

-- CreateEnum
CREATE TYPE "public"."CountStatus" AS ENUM ('OPEN', 'POSTED');

-- CreateTable
CREATE TABLE "public"."Item" (
    "id" BIGSERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "minQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."Batch" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "lotNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "qtyOnHand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMove" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "batchId" BIGINT,
    "fromLocId" BIGINT,
    "toLocId" BIGINT,
    "qty" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" BIGINT,
    "eventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Threshold" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "locationId" BIGINT NOT NULL,
    "minQty" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "Threshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" BIGSERIAL NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "itemId" BIGINT NOT NULL,
    "locationId" BIGINT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Issue" (
    "id" BIGSERIAL NOT NULL,
    "issueNo" TEXT NOT NULL,
    "fromLocId" BIGINT NOT NULL,
    "toLocId" BIGINT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IssueLine" (
    "id" BIGSERIAL NOT NULL,
    "issueId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qtyReq" DECIMAL(65,30) NOT NULL,
    "qtyIssued" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "IssueLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IssueAlloc" (
    "id" BIGSERIAL NOT NULL,
    "issueLineId" BIGINT NOT NULL,
    "batchId" BIGINT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "IssueAlloc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transfer" (
    "id" BIGSERIAL NOT NULL,
    "transferNo" TEXT NOT NULL,
    "fromLocId" BIGINT NOT NULL,
    "toLocId" BIGINT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransferLine" (
    "id" BIGSERIAL NOT NULL,
    "transferId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "TransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CountSession" (
    "id" BIGSERIAL NOT NULL,
    "sessionNo" TEXT NOT NULL,
    "locationId" BIGINT NOT NULL,
    "status" "public"."CountStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CountLine" (
    "id" BIGSERIAL NOT NULL,
    "sessionId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "countedQty" DECIMAL(65,30) NOT NULL,
    "systemQty" DECIMAL(65,30) NOT NULL,
    "variance" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReceivingInspection" (
    "id" BIGSERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "sealsIntact" BOOLEAN,
    "tempOk" BOOLEAN,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivingInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_sku_key" ON "public"."Item"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "public"."Location"("name");

-- CreateIndex
CREATE INDEX "Batch_itemId_expiryDate_idx" ON "public"."Batch"("itemId", "expiryDate");

-- CreateIndex
CREATE INDEX "Batch_itemId_lotNo_idx" ON "public"."Batch"("itemId", "lotNo");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_itemId_lotNo_expiryDate_key" ON "public"."Batch"("itemId", "lotNo", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockMove_eventId_key" ON "public"."StockMove"("eventId");

-- CreateIndex
CREATE INDEX "StockMove_itemId_occurredAt_idx" ON "public"."StockMove"("itemId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMove_refType_refId_idx" ON "public"."StockMove"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "Threshold_itemId_locationId_key" ON "public"."Threshold"("itemId", "locationId");

-- CreateIndex
CREATE INDEX "Notification_type_itemId_locationId_resolvedAt_idx" ON "public"."Notification"("type", "itemId", "locationId", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_issueNo_key" ON "public"."Issue"("issueNo");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_transferNo_key" ON "public"."Transfer"("transferNo");

-- CreateIndex
CREATE UNIQUE INDEX "CountSession_sessionNo_key" ON "public"."CountSession"("sessionNo");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingInspection_eventId_key" ON "public"."ReceivingInspection"("eventId");

-- AddForeignKey
ALTER TABLE "public"."Batch" ADD CONSTRAINT "Batch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_fromLocId_fkey" FOREIGN KEY ("fromLocId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMove" ADD CONSTRAINT "StockMove_toLocId_fkey" FOREIGN KEY ("toLocId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Threshold" ADD CONSTRAINT "Threshold_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Threshold" ADD CONSTRAINT "Threshold_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Issue" ADD CONSTRAINT "Issue_fromLocId_fkey" FOREIGN KEY ("fromLocId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Issue" ADD CONSTRAINT "Issue_toLocId_fkey" FOREIGN KEY ("toLocId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IssueLine" ADD CONSTRAINT "IssueLine_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "public"."Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IssueLine" ADD CONSTRAINT "IssueLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IssueAlloc" ADD CONSTRAINT "IssueAlloc_issueLineId_fkey" FOREIGN KEY ("issueLineId") REFERENCES "public"."IssueLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IssueAlloc" ADD CONSTRAINT "IssueAlloc_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_fromLocId_fkey" FOREIGN KEY ("fromLocId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_toLocId_fkey" FOREIGN KEY ("toLocId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransferLine" ADD CONSTRAINT "TransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "public"."Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransferLine" ADD CONSTRAINT "TransferLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CountSession" ADD CONSTRAINT "CountSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CountLine" ADD CONSTRAINT "CountLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."CountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CountLine" ADD CONSTRAINT "CountLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
