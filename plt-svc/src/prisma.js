const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

if (!process.env.DATABASE_URL && process.env.PLT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.PLT_DATABASE_URL;
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = prisma;
module.exports.prisma = prisma;
