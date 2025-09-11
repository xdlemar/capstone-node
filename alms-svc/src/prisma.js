const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
process.on("beforeExit", async () => { try { await prisma.$disconnect(); } catch {} });
module.exports = { prisma };
