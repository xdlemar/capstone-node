-- Add vendor-provided receipt numbers
ALTER TABLE "VendorReceipt" ADD COLUMN "drNo" TEXT;
ALTER TABLE "VendorReceipt" ADD COLUMN "invoiceNo" TEXT;
