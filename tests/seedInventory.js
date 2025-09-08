// tests/seedInventory.js
require('dotenv').config({ path: 'tests/.env.test' });

// 👇 point to the generated client under inventory-svc
const { PrismaClient } = require('../inventory-svc/node_modules/@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  await prisma.item.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: { id: BigInt(1), sku: 'ITEM-001', name: 'Exam Gloves', unit: 'box', minQty: 0 },
  });

  await prisma.location.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: { id: BigInt(1), name: 'Main Warehouse', kind: 'WAREHOUSE' },
  });

  await prisma.location.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: { id: BigInt(2), name: 'ER Storeroom', kind: 'ROOM' },
  });

  console.log('✅ Seeded inventory: Item(1), Location(1), Location(2)');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
