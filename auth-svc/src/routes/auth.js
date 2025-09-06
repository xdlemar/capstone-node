const { Router } = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const u = await prisma.user.create({ data: { email, passwordHash } });

  const staff = await prisma.role.upsert({
    where: { name: "STAFF" },
    update: {},
    create: { name: "STAFF" },
  });
  await prisma.userRole.create({ data: { userId: u.id, roleId: staff.id } });

  res.status(201).json({ id: u.id, email: u.email });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  await prisma.loginAudit.create({
    data: { userId: user?.id ?? null, emailTried: email, success: !!ok },
  });

  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const roles = user.roles.map((r) => r.role.name);
  const token = jwt.sign(
    { sub: String(user.id), roles },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "8h" }
  );
  res.json({ access_token: token });
});

module.exports = router;
