const bcrypt = require('bcryptjs');
const { prisma } = require('./prisma');

async function main() {
  const roles = {};
  for (const name of ['STAFF', 'MANAGER', 'ADMIN']) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    roles[name] = role;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@hospital.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles.ADMIN.id } },
    update: {},
    create: { userId: admin.id, roleId: roles.ADMIN.id },
  });

  console.log('Seeded roles');
  console.log('Admin user =>', adminEmail);
  console.log('Password =>', adminPassword);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
