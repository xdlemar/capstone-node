-- CreateTable
CREATE TABLE "public"."VendorUser" (
    "id" BIGSERIAL NOT NULL,
    "vendorId" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorUser_vendorId_userId_key" ON "public"."VendorUser"("vendorId", "userId");

-- CreateIndex
CREATE INDEX "VendorUser_userId_idx" ON "public"."VendorUser"("userId");

-- AddForeignKey
ALTER TABLE "public"."VendorUser" ADD CONSTRAINT "VendorUser_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
