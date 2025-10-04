const bcrypt = require("bcryptjs");
const { prisma } = require("./prisma");
const { sanitizeDocScopesInput } = require("./lib/docScopes");

const USERS = [
  {
    email: process.env.SEED_ADMIN_EMAIL || "admin@hospital.local",
    password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    docScopes: {
      PROCUREMENT: ["*"],
      DELIVERY: ["*"],
      PROJECT: ["*"],
      ASSET: ["*"],
      MAINTENANCE: ["*"],
      INVENTORY: ["*"],
      OTHER: ["*"],
    },
  },
  {
    email: process.env.SEED_MANAGER_EMAIL || "manager@hospital.local",
    password: process.env.SEED_MANAGER_PASSWORD || "ManageMe123!",
    roles: ["MANAGER", "STAFF"],
    docScopes: {
      PROCUREMENT: ["*"],
      DELIVERY: ["*"],
      PROJECT: ["*"],
      ASSET: ["*"],
      MAINTENANCE: ["*"],
    },
  },
  {
    email: process.env.SEED_STAFF_EMAIL || "staff@hospital.local",
    password: process.env.SEED_STAFF_PASSWORD || "StaffMe123!",
    roles: ["STAFF"],
    docScopes: {
      DELIVERY: ["*"],
    },
  },
];

async function main() {
  const roles = {};
  for (const name of ["STAFF", "MANAGER", "ADMIN"]) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    roles[name] = role;
  }

  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const docScopes = sanitizeDocScopesInput(user.docScopes);
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash, docScopes },
      create: { email: user.email, passwordHash, docScopes },
    });

    for (const roleName of user.roles) {
      const role = roles[roleName];
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: record.id, roleId: role.id } },
        update: {},
        create: { userId: record.id, roleId: role.id },
      });
    }
  }

  console.log("Seeded roles and users:");
  USERS.forEach((u) => {
    console.log(`${u.email} -> ${u.roles.join(", ")}`);
    console.log(`  password: ${u.password}`);
  });
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));


