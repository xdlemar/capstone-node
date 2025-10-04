require("./setup-env");

const path = require("path");
const dotenv = require("dotenv");

const originalDbUrl = process.env.DATABASE_URL;
const originalAuthDbUrl = process.env.AUTH_DATABASE_URL;

const authEnv = dotenv.config({ path: path.join(__dirname, "..", "auth-svc", ".env") });
const effectiveAuthDbUrl = process.env.AUTH_DATABASE_URL || authEnv.parsed?.DATABASE_URL;

if (!effectiveAuthDbUrl) {
  throw new Error("AUTH_DATABASE_URL is required for auth login tests");
}

process.env.DATABASE_URL = effectiveAuthDbUrl;
process.env.AUTH_DATABASE_URL = effectiveAuthDbUrl;

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
    if (originalDbUrl) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    if (originalAuthDbUrl) {
      process.env.AUTH_DATABASE_URL = originalAuthDbUrl;
    } else {
      delete process.env.AUTH_DATABASE_URL;
    }
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

