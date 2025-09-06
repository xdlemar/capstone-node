const { prisma } = require("./prisma");

async function main() {
  for (const name of ["STAFF", "MANAGER", "ADMIN"]) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("Seeded roles");
}
main().finally(() => process.exit(0));
