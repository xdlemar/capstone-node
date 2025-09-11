/*
  Warnings:

  - You are about to drop the column `type` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the `DocumentACL` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentAudit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentVersion` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `module` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DocumentModule" AS ENUM ('INVENTORY', 'PROCUREMENT', 'DELIVERY', 'PROJECT', 'ASSET', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocAction" AS ENUM ('VIEW', 'DOWNLOAD', 'CREATE', 'UPDATE', 'DELETE', 'SIGN');

-- CreateEnum
CREATE TYPE "public"."SignatureMethod" AS ENUM ('DRAWN', 'TYPED', 'UPLOADED', 'PKI');

-- DropForeignKey
ALTER TABLE "public"."DocumentACL" DROP CONSTRAINT "DocumentACL_documentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentAudit" DROP CONSTRAINT "DocumentAudit_documentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DocumentVersion" DROP CONSTRAINT "DocumentVersion_documentId_fkey";

-- AlterTable
ALTER TABLE "public"."Document" DROP COLUMN "type",
ADD COLUMN     "assetId" BIGINT,
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "deliveryId" BIGINT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "module" "public"."DocumentModule" NOT NULL,
ADD COLUMN     "poId" BIGINT,
ADD COLUMN     "receiptId" BIGINT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "storageKey" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploaderId" BIGINT,
ADD COLUMN     "woId" BIGINT;

-- DropTable
DROP TABLE "public"."DocumentACL";

-- DropTable
DROP TABLE "public"."DocumentAudit";

-- DropTable
DROP TABLE "public"."DocumentVersion";

-- CreateTable
CREATE TABLE "public"."DocVersion" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "size" INTEGER,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" BIGINT,

    CONSTRAINT "DocVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocSignature" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "signerId" BIGINT,
    "method" "public"."SignatureMethod" NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageKey" TEXT,
    "ip" TEXT,

    CONSTRAINT "DocSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocTag" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DocTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocAccessAudit" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "userId" BIGINT,
    "action" "public"."DocAction" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "DocAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocVersion_documentId_versionNo_key" ON "public"."DocVersion"("documentId", "versionNo");

-- CreateIndex
CREATE INDEX "DocSignature_documentId_signerId_idx" ON "public"."DocSignature"("documentId", "signerId");

-- CreateIndex
CREATE INDEX "DocTag_name_idx" ON "public"."DocTag"("name");

-- CreateIndex
CREATE INDEX "DocAccessAudit_documentId_occurredAt_idx" ON "public"."DocAccessAudit"("documentId", "occurredAt");

-- CreateIndex
CREATE INDEX "Document_module_projectId_idx" ON "public"."Document"("module", "projectId");

-- CreateIndex
CREATE INDEX "Document_poId_idx" ON "public"."Document"("poId");

-- CreateIndex
CREATE INDEX "Document_receiptId_idx" ON "public"."Document"("receiptId");

-- CreateIndex
CREATE INDEX "Document_deliveryId_idx" ON "public"."Document"("deliveryId");

-- CreateIndex
CREATE INDEX "Document_assetId_idx" ON "public"."Document"("assetId");

-- AddForeignKey
ALTER TABLE "public"."DocVersion" ADD CONSTRAINT "DocVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocSignature" ADD CONSTRAINT "DocSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocTag" ADD CONSTRAINT "DocTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocAccessAudit" ADD CONSTRAINT "DocAccessAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
