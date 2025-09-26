const path = require("path");
const dotenv = require("dotenv");

// Ensure we point Prisma at the test datasource
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for test seeding");
}

// Use the generated client that ships with the inventory service so we stay in sync
const { PrismaClient } = require("../inventory-svc/node_modules/@prisma/client");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  await prisma.item.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      id: BigInt(1),
      sku: "ITEM-001",
      name: "Exam Gloves",
      unit: "box",
      minQty: 0,
    },
  });

  await prisma.location.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      id: BigInt(1),
      name: "Main Warehouse",
      kind: "WAREHOUSE",
    },
  });

  await prisma.location.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: {
      id: BigInt(2),
      name: "ER Storeroom",
      kind: "ROOM",
    },
  });

  console.log("Seeded inventory references for tests");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
