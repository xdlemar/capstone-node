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

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error("[auth me] invalid token", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

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

router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = BigInt(req.user.sub);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      roles: user.roles.map((r) => r.role.name),
      docScopes: user.docScopes || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error("[GET /me]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const userId = BigInt(req.user.sub);
    const { name, currentPassword, newPassword } = req.body || {};

    const updates = {};
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed.length < 2) return res.status(400).json({ error: "Name must be at least 2 characters" });
      updates.name = trimmed;
    }

    let passwordHash;
    if (newPassword !== undefined) {
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }
      if (!currentPassword || typeof currentPassword !== "string") {
        return res.status(400).json({ error: "Current password is required to change password" });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found" });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
      passwordHash = await bcrypt.hash(newPassword, 10);
      updates.passwordHash = passwordHash;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No changes provided" });
    }

    await prisma.user.update({ where: { id: userId }, data: updates });

    const refreshed = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!refreshed) return res.status(404).json({ error: "User not found" });

    const roles = refreshed.roles.map((r) => r.role.name);
    const docScopes = buildDocScopes(refreshed, roles);
    const payload = {
      sub: String(refreshed.id),
      roles,
      docScopes,
      name: refreshed.name || null,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || "8h",
    });

    res.json({
      access_token: token,
      user: {
        id: refreshed.id.toString(),
        email: refreshed.email,
        name: refreshed.name,
        roles,
        docScopes,
        createdAt: refreshed.createdAt,
        updatedAt: refreshed.updatedAt,
      },
    });
  } catch (err) {
    console.error("[PATCH /me]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;

