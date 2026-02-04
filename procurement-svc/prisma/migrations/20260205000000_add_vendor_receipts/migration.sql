-- CreateTable
CREATE TABLE "public"."VendorReceipt" (
    "id" BIGSERIAL NOT NULL,
    "poId" BIGINT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VendorReceiptLine" (
    "id" BIGSERIAL NOT NULL,
    "vendorReceiptId" BIGINT NOT NULL,
    "itemId" BIGINT NOT NULL,
    "qty" INTEGER NOT NULL,
    "lotNo" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorReceipt_poId_key" ON "public"."VendorReceipt"("poId");

-- AddForeignKey
ALTER TABLE "public"."VendorReceipt" ADD CONSTRAINT "VendorReceipt_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."PO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VendorReceiptLine" ADD CONSTRAINT "VendorReceiptLine_vendorReceiptId_fkey" FOREIGN KEY ("vendorReceiptId") REFERENCES "public"."VendorReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
