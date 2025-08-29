-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" BIGSERIAL NOT NULL,
    "poNo" TEXT NOT NULL,
    "supplierId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_lines" (
    "id" BIGSERIAL NOT NULL,
    "poId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qtyOrdered" DECIMAL(65,30) NOT NULL,
    "qtyReceived" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grns" (
    "id" BIGSERIAL NOT NULL,
    "grnNo" TEXT NOT NULL,
    "poId" BIGINT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grn_lines" (
    "id" BIGSERIAL NOT NULL,
    "grnId" BIGINT NOT NULL,
    "poLineId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "uomCode" TEXT NOT NULL,
    "qtyReceived" DECIMAL(65,30) NOT NULL,
    "lotNo" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "locationId" BIGINT NOT NULL,
    "binId" BIGINT,

    CONSTRAINT "grn_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "public"."suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNo_key" ON "public"."purchase_orders"("poNo");

-- CreateIndex
CREATE UNIQUE INDEX "grns_grnNo_key" ON "public"."grns"("grnNo");

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grns" ADD CONSTRAINT "grns_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grn_lines" ADD CONSTRAINT "grn_lines_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "public"."grns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grn_lines" ADD CONSTRAINT "grn_lines_poLineId_fkey" FOREIGN KEY ("poLineId") REFERENCES "public"."purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
