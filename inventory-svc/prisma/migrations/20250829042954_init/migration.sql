-- CreateTable
CREATE TABLE "public"."items" (
    "id" BIGSERIAL NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "uomCode" TEXT NOT NULL,
    "isLotTracked" BOOLEAN NOT NULL DEFAULT true,
    "isExpiryTracked" BOOLEAN NOT NULL DEFAULT true,
    "fefoEnforced" BOOLEAN NOT NULL DEFAULT true,
    "safetyStock" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reorderMin" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reorderMax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."locations" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" BIGINT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bins" (
    "id" BIGSERIAL NOT NULL,
    "locationId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "bins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."item_lots" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "item_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_balances" (
    "id" BIGSERIAL NOT NULL,
    "itemId" BIGINT NOT NULL,
    "locationId" BIGINT NOT NULL,
    "binId" BIGINT,
    "lotId" BIGINT,
    "onHand" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_txns" (
    "id" BIGSERIAL NOT NULL,
    "txnTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qty" DECIMAL(18,2) NOT NULL,
    "uomCode" TEXT NOT NULL,
    "fromLocationId" BIGINT,
    "fromBinId" BIGINT,
    "toLocationId" BIGINT,
    "toBinId" BIGINT,
    "lotId" BIGINT,
    "referenceTable" TEXT,
    "referenceId" BIGINT,
    "notes" TEXT,

    CONSTRAINT "inventory_txns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "items_itemCode_key" ON "public"."items"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "public"."locations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bins_locationId_code_key" ON "public"."bins"("locationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "item_lots_itemId_lotNo_key" ON "public"."item_lots"("itemId", "lotNo");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_itemId_locationId_binId_lotId_key" ON "public"."inventory_balances"("itemId", "locationId", "binId", "lotId");

-- CreateIndex
CREATE INDEX "inventory_txns_itemId_txnTime_idx" ON "public"."inventory_txns"("itemId", "txnTime");

-- AddForeignKey
ALTER TABLE "public"."bins" ADD CONSTRAINT "bins_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."item_lots" ADD CONSTRAINT "item_lots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_balances" ADD CONSTRAINT "inventory_balances_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_balances" ADD CONSTRAINT "inventory_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_balances" ADD CONSTRAINT "inventory_balances_binId_fkey" FOREIGN KEY ("binId") REFERENCES "public"."bins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_balances" ADD CONSTRAINT "inventory_balances_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."item_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_txns" ADD CONSTRAINT "inventory_txns_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_txns" ADD CONSTRAINT "inventory_txns_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."item_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
