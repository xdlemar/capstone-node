const { Router } = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const { prisma } = require("../prisma");
const { buildDocScopes, sanitizeDocScopesInput } = require("../lib/docScopes");

const router = Router();

const OTP_PURPOSE_LOGIN = "LOGIN";
const OTP_PURPOSE_RESET = "PASSWORD_RESET";
const OTP_TTL_SECONDS = Number(process.env.AUTH_LOGIN_OTP_TTL_SEC || 300);
const OTP_RESET_TTL_SECONDS = Number(
  process.env.AUTH_RESET_OTP_TTL_SEC || process.env.AUTH_LOGIN_OTP_TTL_SEC || 600
);
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@localhost";
const loginAttempts = new Map();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function createTransporter() {
  if (!process.env.SMTP_HOST) {
    console.warn("[auth] SMTP_HOST not set. OTP emails will be logged to console.");
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

  const allowSelfSigned = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false";
  const localAddress = process.env.SMTP_LOCAL_ADDRESS || undefined;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
    tls: allowSelfSigned ? { rejectUnauthorized: false } : undefined,
    localAddress,
  });
}

const mailer = createTransporter();

async function sendLoginOtp(to, code) {
  if (!mailer) {
    console.warn(`[auth] OTP for ${to}: ${code}`);
    return;
  }

  const subject = "Your Logistics 1 login code";
  const text = `Your verification code is ${code}. It will expire in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.`;
  const html = `<p>Use the code below to finish signing in.</p><h2 style="font-size:24px;margin:16px 0;">${code}</h2><p>This code expires in ${Math.floor(
    OTP_TTL_SECONDS / 60
  )} minutes.</p>`;

  await mailer.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

async function sendResetOtp(to, code) {
  if (!mailer) {
    console.warn(`[auth] Reset OTP for ${to}: ${code}`);
    return;
  }

  const minutes = Math.max(1, Math.floor(OTP_RESET_TTL_SECONDS / 60));
  const subject = "Reset your password";
  const text = `Your password reset code is ${code}. It will expire in ${minutes} minutes.`;
  const html = `<p>Use the code below to reset your password.</p><h2 style="font-size:24px;margin:16px 0;">${code}</h2><p>This code expires in ${minutes} minutes.</p>`;

  await mailer.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

async function verifyGoogleIdToken(idToken) {
  if (!googleClient) {
    throw new Error("Google OAuth client not configured");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

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
  const key = typeof email === "string" ? email.trim().toLowerCase() : "";
  const now = Date.now();
  const attempt = loginAttempts.get(key) || { count: 0, blockedUntil: 0, stage: 0 };

  if (attempt.blockedUntil && attempt.blockedUntil > now) {
    const retryAfterMs = attempt.blockedUntil - now;
    return res
      .status(429)
      .json({ error: "Too many attempts, try again later", retryAfterSeconds: Math.ceil(retryAfterMs / 1000) });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    attempt.count += 1;
    const limit = 5;
    if (attempt.count >= limit) {
      const durationMs = attempt.stage === 0 ? 3 * 60 * 1000 : 10 * 60 * 1000;
      attempt.blockedUntil = now + durationMs;
      attempt.count = 0;
      attempt.stage = Math.min(attempt.stage + 1, 1);
      loginAttempts.set(key, attempt);
      return res.status(429).json({
        error: "Too many attempts, try again later",
        retryAfterSeconds: Math.ceil(durationMs / 1000),
      });
    }
    loginAttempts.set(key, attempt);
    return res.status(404).json({ error: "Account not found" });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  const active = !!user?.isActive;

  await prisma.loginAudit.create({
    data: {
      userId: user?.id ?? null,
      emailTried: email,
      success: passwordOk && active,
    },
  });

  if (!passwordOk) {
    attempt.count += 1;
    const limit = 5;
    if (attempt.count >= limit) {
      const durationMs = attempt.stage === 0 ? 3 * 60 * 1000 : 10 * 60 * 1000;
      attempt.blockedUntil = now + durationMs;
      attempt.count = 0;
      attempt.stage = Math.min(attempt.stage + 1, 1);
      loginAttempts.set(key, attempt);
      return res.status(429).json({
        error: "Too many attempts, try again later",
        retryAfterSeconds: Math.ceil(durationMs / 1000),
      });
    }
    loginAttempts.set(key, attempt);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!active) {
    return res.status(403).json({ error: "Account disabled" });
  }

  // Successful login resets tracking
  loginAttempts.delete(key);

  await prisma.oTP.deleteMany({
    where: { userId: user.id, purpose: OTP_PURPOSE_LOGIN },
  });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  const otp = await prisma.oTP.create({
    data: {
      userId: user.id,
      purpose: OTP_PURPOSE_LOGIN,
      codeHash,
      expiresAt,
    },
  });

  try {
    await sendLoginOtp(user.email, code);
  } catch (err) {
    console.error("[auth login] failed to send OTP", err);
    try {
      await prisma.oTP.delete({ where: { id: otp.id } });
    } catch (deleteErr) {
      if (deleteErr?.code !== "P2025") {
        throw deleteErr;
      }
    }
    return res.status(500).json({ error: "Failed to send OTP email" });
  }

  res.json({
    otpId: otp.id.toString(),
    expiresIn: OTP_TTL_SECONDS,
  });
});

router.post("/login/otp", async (req, res) => {
  const { otpId, code } = req.body || {};
  if (!otpId || !code) {
    return res.status(400).json({ error: "otpId and code are required" });
  }

  let idBigInt;
  try {
    idBigInt = BigInt(otpId);
  } catch {
    return res.status(400).json({ error: "Invalid otpId" });
  }

  const otp = await prisma.oTP.findUnique({
    where: { id: idBigInt },
    include: {
      user: {
        include: { roles: { include: { role: true } } },
      },
    },
  });

  if (!otp || otp.purpose !== OTP_PURPOSE_LOGIN) {
    return res.status(400).json({ error: "OTP not found" });
  }

  if (otp.usedAt) {
    return res.status(400).json({ error: "OTP already used" });
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: "OTP expired" });
  }

  const codeValid = await bcrypt.compare(String(code), otp.codeHash);
  if (!codeValid) {
    return res.status(401).json({ error: "Invalid code" });
  }

  await prisma.oTP.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  const user = otp.user;
  if (!user || !user.isActive) {
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

router.post("/login/google", async (req, res) => {
  const idToken = req.body?.credential || req.body?.idToken || req.body?.token;
  if (!idToken) {
    return res.status(400).json({ error: "Missing Google credential" });
  }
  if (!googleClient) {
    return res.status(500).json({ error: "Google login not configured" });
  }

  let payload;
  try {
    payload = await verifyGoogleIdToken(String(idToken));
  } catch (err) {
    console.error("[auth google] invalid token", err?.message || err);
    return res.status(401).json({ error: "Invalid Google token" });
  }

  const email = String(payload?.email || "").trim();
  if (!email) {
    return res.status(400).json({ error: "Google account missing email" });
  }
  if (!payload?.email_verified) {
    return res.status(401).json({ error: "Google email not verified" });
  }

  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const initialScopes = sanitizeDocScopesInput();
    const created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: payload?.name || null,
        passwordHash,
        docScopes: initialScopes,
      },
    });
    const staff = await prisma.role.upsert({
      where: { name: "STAFF" },
      update: {},
      create: { name: "STAFF" },
    });
    await prisma.userRole.create({ data: { userId: created.id, roleId: staff.id } });

    user = await prisma.user.findUnique({
      where: { id: created.id },
      include: { roles: { include: { role: true } } },
    });
  }

  if (!user) {
    return res.status(500).json({ error: "Failed to create user" });
  }

  if (!user.isActive) {
    await prisma.loginAudit.create({
      data: { userId: user.id, emailTried: email, success: false },
    });
    return res.status(403).json({ error: "Account disabled" });
  }

  if (!user.name && payload?.name) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name: payload.name },
      include: { roles: { include: { role: true } } },
    });
  }

  await prisma.loginAudit.create({
    data: { userId: user.id, emailTried: email, success: true },
  });

  const roles = user.roles.map((r) => r.role.name);
  const docScopes = buildDocScopes(user, roles);
  const token = jwt.sign(
    {
      sub: String(user.id),
      roles,
      docScopes,
      name: user.name || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "8h" }
  );

  res.json({ access_token: token, roles, docScopes, name: user.name || null });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return res.status(404).json({ error: "Account not found" });
  }

  await prisma.oTP.deleteMany({
    where: { userId: user.id, purpose: OTP_PURPOSE_RESET },
  });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_RESET_TTL_SECONDS * 1000);

  const otp = await prisma.oTP.create({
    data: {
      userId: user.id,
      purpose: OTP_PURPOSE_RESET,
      codeHash,
      expiresAt,
    },
  });

  try {
    await sendResetOtp(user.email, code);
  } catch (err) {
    console.error("[auth forgot-password] failed to send OTP", err);
    try {
      await prisma.oTP.delete({ where: { id: otp.id } });
    } catch (deleteErr) {
      if (deleteErr?.code !== "P2025") {
        throw deleteErr;
      }
    }
  }

  res.json({ ok: true, expiresIn: OTP_RESET_TTL_SECONDS });
});

router.post("/forgot-password/verify", async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "email, code, and newPassword are required" });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    return res.status(400).json({ error: "Invalid code or email" });
  }

  const otp = await prisma.oTP.findFirst({
    where: {
      userId: user.id,
      purpose: OTP_PURPOSE_RESET,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
  });

  if (!otp) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const codeValid = await bcrypt.compare(String(code), otp.codeHash);
  if (!codeValid) {
    return res.status(401).json({ error: "Invalid code" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.oTP.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  res.json({ ok: true, message: "Password updated" });
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
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
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
