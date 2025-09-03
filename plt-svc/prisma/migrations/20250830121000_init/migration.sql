/*
  Warnings:

  - You are about to drop the `document_moves` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documents` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE');

-- DropForeignKey
ALTER TABLE "public"."document_moves" DROP CONSTRAINT "document_moves_docId_fkey";

-- DropTable
DROP TABLE "public"."document_moves";

-- DropTable
DROP TABLE "public"."documents";

-- DropEnum
DROP TYPE "public"."DocStatus";

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerDept" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_tasks" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "public"."projects"("code");

-- AddForeignKey
ALTER TABLE "public"."project_tasks" ADD CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
