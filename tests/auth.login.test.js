require("./setup-env");

const request = require("supertest");
const bcrypt = require("../auth-svc/node_modules/bcryptjs");

const app = require("../auth-svc/src/server");
const prisma = require("../auth-svc/src/prisma");

describe("POST /login", () => {
  const password = "Password123!";
  const activeEmail = "active.test@example.com";
  const inactiveEmail = "inactive.test@example.com";
  let activeUserId;
  let inactiveUserId;

  beforeAll(async () => {
    const hash = await bcrypt.hash(password, 10);

    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });

    await prisma.loginAudit.deleteMany({
      where: { emailTried: { in: [activeEmail, inactiveEmail] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [activeEmail, inactiveEmail] } },
    });

    const activeUser = await prisma.user.create({
      data: {
        email: activeEmail,
        passwordHash: hash,
        isActive: true,
      },
    });

    const inactiveUser = await prisma.user.create({
      data: {
        email: inactiveEmail,
        passwordHash: hash,
        isActive: false,
      },
    });

    await prisma.userRole.createMany({
      data: [
        { userId: activeUser.id, roleId: adminRole.id },
        { userId: inactiveUser.id, roleId: adminRole.id },
      ],
      skipDuplicates: true,
    });

    activeUserId = activeUser.id;
    inactiveUserId = inactiveUser.id;
  });

  afterAll(async () => {
    await prisma.loginAudit.deleteMany({
      where: { emailTried: { in: [activeEmail, inactiveEmail] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [activeUserId, inactiveUserId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  test("rejects login for inactive users", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: inactiveEmail, password });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Account disabled" });

    const [audit] = await prisma.loginAudit.findMany({
      where: { emailTried: inactiveEmail },
      orderBy: { at: "desc" },
      take: 1,
    });

    expect(audit?.success).toBe(false);
  });

  test("allows login for active users", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: activeEmail, password });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toEqual(expect.any(String));

    const [audit] = await prisma.loginAudit.findMany({
      where: { emailTried: activeEmail },
      orderBy: { at: "desc" },
      take: 1,
    });

    expect(audit?.success).toBe(true);
  });
});

