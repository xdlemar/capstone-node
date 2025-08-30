/*
  Warnings:

  - You are about to drop the `asset_maint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assets` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."DocStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'RELEASED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "public"."asset_maint" DROP CONSTRAINT "asset_maint_assetId_fkey";

-- DropTable
DROP TABLE "public"."asset_maint";

-- DropTable
DROP TABLE "public"."assets";

-- DropEnum
DROP TYPE "public"."AssetStatus";

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" BIGSERIAL NOT NULL,
    "docNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "status" "public"."DocStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerDept" TEXT,
    "relatedPoId" BIGINT,
    "relatedGrnId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_moves" (
    "id" BIGSERIAL NOT NULL,
    "docId" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT,

    CONSTRAINT "document_moves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_docNo_key" ON "public"."documents"("docNo");

-- CreateIndex
CREATE INDEX "document_moves_docId_idx" ON "public"."document_moves"("docId");

-- AddForeignKey
ALTER TABLE "public"."document_moves" ADD CONSTRAINT "document_moves_docId_fkey" FOREIGN KEY ("docId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
