/*
  Warnings:

  - You are about to drop the `document_moves` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."document_moves" DROP CONSTRAINT "document_moves_docId_fkey";

-- DropTable
DROP TABLE "public"."document_moves";

-- DropTable
DROP TABLE "public"."documents";

-- DropEnum
DROP TYPE "public"."DocStatus";

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" BIGINT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentVersion" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "fileKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentACL" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "principal" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "DocumentACL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentAudit" (
    "id" BIGSERIAL NOT NULL,
    "documentId" BIGINT NOT NULL,
    "userId" BIGINT,
    "action" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNo_key" ON "public"."DocumentVersion"("documentId", "versionNo");

-- CreateIndex
CREATE INDEX "DocumentACL_principal_idx" ON "public"."DocumentACL"("principal");

-- AddForeignKey
ALTER TABLE "public"."DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentACL" ADD CONSTRAINT "DocumentACL_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentAudit" ADD CONSTRAINT "DocumentAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
