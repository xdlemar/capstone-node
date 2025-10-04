-- Safe rebuild of legacy logistics tables (drop optional inventory tables before creating project assets)

DO $$ BEGIN
  EXECUTE 'DROP TABLE IF EXISTS "public"."asset_maint" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "public"."assets" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "public"."inventory_balances" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "public"."inventory_txns" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "public"."item_lots" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "public"."bins" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "public"."items" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "public"."locations" CASCADE';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DROP TYPE IF EXISTS "public"."AssetStatus";
CREATE TYPE "public"."AssetStatus" AS ENUM ('IN_SERVICE', 'MAINTENANCE', 'RETIRED');

CREATE TABLE "public"."assets" (
    "id" BIGSERIAL NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "locationId" BIGINT,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."asset_maint" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "assets_tag_key" ON "public"."assets"("tag");
CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "public"."assets"("status");
CREATE INDEX IF NOT EXISTS "asset_maint_assetId_idx" ON "public"."asset_maint"("assetId");

ALTER TABLE "public"."asset_maint"
  ADD CONSTRAINT "asset_maint_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
