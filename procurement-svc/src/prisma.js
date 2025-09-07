// procurement-svc/src/prisma.js
require("dotenv").config();               // ensure DATABASE_URL is present before client boots
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
module.exports = prisma;

