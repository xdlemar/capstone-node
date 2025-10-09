const { Router } = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");
const { buildDocScopes, sanitizeDocScopesInput } = require("../lib/docScopes");

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, docScopes } = req.body || {};
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const initialScopes = sanitizeDocScopesInput(docScopes);
  const u = await prisma.user.create({ data: { email, passwordHash, docScopes: initialScopes } });

  const staff = await prisma.role.upsert({
    where: { name: "STAFF" },
    update: {},
    create: { name: "STAFF" },
  });
  await prisma.userRole.create({ data: { userId: u.id, roleId: staff.id } });

  res.status(201).json({ id: u.id, email: u.email, docScopes: initialScopes });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
  const active = !!user?.isActive;

  await prisma.loginAudit.create({
    data: {
      userId: user?.id ?? null,
      emailTried: email,
      success: passwordOk && active,
    },
  });

  if (!passwordOk) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!active) {
    return res.status(403).json({ error: "Account disabled" });
  }

  const roles = user.roles.map((r) => r.role.name);
  const docScopes = buildDocScopes(user, roles);
  const payload = {
    sub: String(user.id),
    roles,
    docScopes,
    name: user.name || null,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "8h",
  });
  res.json({ access_token: token, roles, docScopes, name: user.name || null });
});

module.exports = router;

