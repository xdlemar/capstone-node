-- AlterTable
ALTER TABLE "public"."ReceiptLine" ADD COLUMN     "qtyDamaged" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."ReceiptLine" ADD COLUMN     "damageReason" TEXT;
ALTER TABLE "public"."ReceiptLine" ADD COLUMN     "damageNotes" TEXT;

-- CreateTable
CREATE TABLE "public"."ReceiptLineDamagePhoto" (
    "id" BIGSERIAL NOT NULL,
    "receiptLineId" BIGINT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptLineDamagePhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ReceiptLineDamagePhoto" ADD CONSTRAINT "ReceiptLineDamagePhoto_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "public"."ReceiptLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
