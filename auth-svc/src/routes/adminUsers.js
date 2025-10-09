const { Router } = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");
const { sanitizeDocScopesInput } = require("../lib/docScopes");

const router = Router();

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!Array.isArray(payload.roles) || !payload.roles.includes("ADMIN")) {
      return res.status(403).json({ error: "Admins only" });
    }
    req.user = payload;
    next();
  } catch (err) {
    console.error("[admin auth]", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function upsertRoles(roleNames, tx = prisma) {
  const uniqueNames = Array.from(new Set(roleNames || [])).filter(Boolean);
  if (uniqueNames.length === 0) {
    uniqueNames.push("STAFF");
  }
  const roles = [];
  for (const name of uniqueNames) {
    const role = await tx.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roles.push(role);
  }
  return roles;
}

router.use(requireAdmin);

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { roles: { include: { role: true } } },
  });
  res.json(
    users.map((user) => ({
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      roles: user.roles.map((r) => r.role.name),
      docScopes: user.docScopes || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))
  );
});

router.post("/users", async (req, res) => {
  try {
    const { email, name, password, roles = ["STAFF"], isActive = true, docScopes } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const scopes = sanitizeDocScopesInput(docScopes);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: name?.trim() || null, passwordHash, isActive, docScopes: scopes },
      });
      const roleRecords = await upsertRoles(roles, tx);
      await tx.userRole.createMany({
        data: roleRecords.map((role) => ({ userId: user.id, roleId: role.id })),
        skipDuplicates: true,
      });
      return user;
    });

    const created = await prisma.user.findUnique({
      where: { id: result.id },
      include: { roles: { include: { role: true } } },
    });

    res.status(201).json({
      id: created.id.toString(),
      email: created.email,
      name: created.name,
      isActive: created.isActive,
      roles: created.roles.map((r) => r.role.name),
      docScopes: created.docScopes || {},
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (err) {
    console.error("[POST /admin/users]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const userId = BigInt(req.params.id);
    const { email, name, password, roles, isActive, docScopes } = req.body || {};

    const updates = {};
    if (typeof email === "string" && email.length > 0) {
      updates.email = email;
    }
    if (typeof name === "string") {
      updates.name = name.trim().length ? name.trim() : null;
    }
    if (typeof isActive === "boolean") {
      updates.isActive = isActive;
    }
    if (typeof password === "string" && password.length > 0) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }
    if (docScopes !== undefined) {
      updates.docScopes = sanitizeDocScopesInput(docScopes);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: updates });
      }
      if (Array.isArray(roles)) {
        await tx.userRole.deleteMany({ where: { userId } });
        const roleRecords = await upsertRoles(roles, tx);
        await tx.userRole.createMany({
          data: roleRecords.map((role) => ({ userId, roleId: role.id })),
          skipDuplicates: true,
        });
      }
      return tx.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
    });

    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json({
      id: updated.id.toString(),
      email: updated.email,
      name: updated.name,
      isActive: updated.isActive,
      roles: updated.roles.map((r) => r.role.name),
      docScopes: updated.docScopes || {},
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("[PATCH /admin/users/:id]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const userId = BigInt(req.params.id);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: { roles: { include: { role: true } } },
    });
    res.json({
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      roles: user.roles.map((r) => r.role.name),
      docScopes: user.docScopes || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error("[DELETE /admin/users/:id]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;








