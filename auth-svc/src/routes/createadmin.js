const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "xdlemar15@gmail.com";
  const password = "masterpogi098";
  const name = "Admin User";

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Check if admin role exists
  let adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (!adminRole) {
    adminRole = await prisma.role.create({ data: { name: "ADMIN" } });
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      isActive: true,
      roles: {
        create: [{ role: { connect: { id: adminRole.id } } }],
      },
    },
    include: { roles: { include: { role: true } } },
  });

  console.log("Admin user created:", user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
