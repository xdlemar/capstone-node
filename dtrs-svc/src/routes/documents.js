const router = require("express").Router();
const crypto = require("crypto");
const { prisma } = require("../prisma");
const { requireRole } = require("../auth");

function toBigInt(value, field, { optional = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  try {
    return BigInt(value);
  } catch {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
}

const REQUIRED_DOCS = {
  PROCUREMENT: [
    { code: "PO", tag: "PO", label: "Signed Purchase Order" },
    { code: "DR", tag: "DR", label: "Delivery Receipt" },
    { code: "INVOICE", tag: "INVOICE", label: "Supplier Invoice" },
  ],
  PROJECT: [
    { code: "PLAN", tag: "PROJECT_PLAN", label: "Project Implementation Plan" },
    { code: "ACCEPTANCE", tag: "ACCEPTANCE", label: "Project Acceptance Form" },
  ],
  DELIVERY: [
    { code: "DR", tag: "DR", label: "Delivery Receipt" },
    { code: "PHOTO", tag: "PHOTO", label: "Delivery Photos" },
  ],
};

const MODULE_SCOPE_FIELD = {
  PROCUREMENT: "poId",
  DELIVERY: "deliveryId",
  PROJECT: "projectId",
  ASSET: "assetId",
  MAINTENANCE: "woId",
};

const managerOnly = requireRole("MANAGER", "ADMIN");
const ELEVATED_ROLES = new Set(["ADMIN", "MANAGER"]);
const ALLOWED_SIGNATURE_METHODS = new Set(["DRAWN", "TYPED", "UPLOADED", "PKI"]);
const ALLOWED_AUDIT_ACTIONS = new Set(["VIEW", "DOWNLOAD", "CREATE", "UPDATE", "DELETE", "SIGN"]);

function getUserRoles(user = {}) {
  const roles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
  return roles.map((role) => String(role).toUpperCase());
}

function isElevated(user) {
  return getUserRoles(user).some((role) => ELEVATED_ROLES.has(role));
}

function normalizeScopeValue(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return String(value);
}

function normalizeScopes(rawScopes) {
  if (!rawScopes || typeof rawScopes !== "object") return null;
  const normalized = {};
  for (const [key, value] of Object.entries(rawScopes)) {
    if (!key) continue;
    normalized[key.toUpperCase()] = value;
  }
  return Object.keys(normalized).length ? normalized : null;
}

function getDocumentScopes(user) {
  if (!user) return null;
  if (user.__docScopesCache !== undefined) return user.__docScopesCache;

  const candidate =
    user.docScopes ||
    user.documentScopes ||
    (user.scopes && (user.scopes.documents || user.scopes.DOCUMENTS));

  const normalized = normalizeScopes(candidate);
  user.__docScopesCache = normalized;
  return normalized;
}

function matchesScopeCandidate(candidate, target) {
  if (candidate === "*" || candidate === true) return true;
  if (candidate === null || candidate === undefined) {
    return target === null || target === undefined;
  }
  const candidateStr = typeof candidate === "bigint" ? candidate.toString() : String(candidate);
  if (target === null || target === undefined) {
    return candidateStr.toLowerCase() === "null";
  }
  return candidateStr === target;
}

function matchesScope(allowed, target) {
  if (allowed === "*" || allowed === true) return true;
  if (Array.isArray(allowed)) {
    return allowed.some((item) => matchesScope(item, target));
  }
  if (typeof allowed === "object" && allowed !== null) {
    if (allowed.all || allowed.allow === "*" || allowed["*"]) return true;
    const list = Array.isArray(allowed.ids)
      ? allowed.ids
      : Array.isArray(allowed.values)
      ? allowed.values
      : Array.isArray(allowed.allowed)
      ? allowed.allowed
      : [];
    return matchesScope(list, target);
  }
  return matchesScopeCandidate(allowed, target);
}

function hasDocumentScope(user, module, rawScopeValue) {
  if (isElevated(user)) return true;

  const scopes = getDocumentScopes(user);
  if (!scopes) {
    if (user && !user.__docScopesWarned) {
      console.warn(`[dtrs] user ${user?.sub || "unknown"} has no document scopes; defaulting to allow.`);
      user.__docScopesWarned = true;
    }
    return true;
  }

  const moduleKey = (module || "").toUpperCase();
  if (!moduleKey) return false;

  const allowed = scopes[moduleKey];
  if (allowed === undefined) return false;

  const normalizedValue = normalizeScopeValue(rawScopeValue);
  if (normalizedValue === undefined || normalizedValue === null) {
    return matchesScope(allowed, "*") || matchesScope(allowed, null);
  }
  return matchesScope(allowed, normalizedValue);
}

function gatherScopeIds(allowed) {
  if (allowed === "*" || allowed === true) return ["*"];
  if (Array.isArray(allowed)) {
    return allowed.flatMap((item) => gatherScopeIds(item));
  }
  if (typeof allowed === "object" && allowed !== null) {
    if (allowed.all || allowed.allow === "*" || allowed["*"]) return ["*"];
    const list = Array.isArray(allowed.ids)
      ? allowed.ids
      : Array.isArray(allowed.values)
      ? allowed.values
      : Array.isArray(allowed.allowed)
      ? allowed.allowed
      : [];
    return gatherScopeIds(list);
  }
  if (allowed === null || allowed === undefined) return [];
  return [allowed];
}

function safeBigInt(value) {
  if (value === null || value === undefined) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function buildDocumentScopeFilters(user) {
  if (isElevated(user)) return null;
  const scopes = getDocumentScopes(user);
  if (!scopes) return null;

  const filters = [];
  for (const [module, allowed] of Object.entries(scopes)) {
    const scopeField = MODULE_SCOPE_FIELD[module];
    if (!scopeField) continue;
    const ids = gatherScopeIds(allowed);
    if (ids.includes("*")) {
      filters.push({ module });
      continue;
    }
    const bigints = ids
      .map((id) => safeBigInt(id))
      .filter((id) => id !== null);
    if (bigints.length) {
      filters.push({ module, [scopeField]: { in: bigints } });
    }
  }
  return filters;
}

function getDocumentScopeValue(doc) {
  const scopeField = MODULE_SCOPE_FIELD[doc.module];
  if (!scopeField) return null;
  return doc[scopeField];
}

function ensureDocumentWrite(req, res, module, source = {}) {
  const scopeField = MODULE_SCOPE_FIELD[module];
  const scopeValue = scopeField ? source[scopeField] : undefined;
  if (!hasDocumentScope(req.user, module, scopeValue)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

async function loadDocumentForRequest(req, res, id) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return null;
  }
  if (!hasDocumentScope(req.user, doc.module, getDocumentScopeValue(doc))) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return doc;
}

function inferUserId(req, provided) {
  if (provided !== undefined && provided !== null && provided !== "") {
    return provided;
  }
  const sub = req.user?.sub;
  if (sub && /^\d+$/.test(String(sub))) {
    return sub;
  }
  return null;
}

function verifyPkiSignature(payload, signature, certificate) {
  const result = { valid: false, digest: null, thumbprint: null };
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(payload);
    verifier.end();
    const signatureBuffer = Buffer.from(signature, "base64");
    result.valid = verifier.verify(certificate, signatureBuffer);
    if (result.valid) {
      result.digest = crypto.createHash("sha256").update(payload).digest("hex");
      result.thumbprint = crypto.createHash("sha1").update(certificate).digest("hex");
    }
  } catch (err) {
    console.warn("[dtrs signatures] PKI verification failed", err.message);
    result.valid = false;
  }
  return result;
}

router.post("/", async (req, res) => {
  try {
    const {
      module,
      title,
      storageKey,
      mimeType,
      size,
      checksum,
      notes,
      uploaderId,
      projectId,
      poId,
      receiptId,
      deliveryId,
      assetId,
      woId,
    } = req.body || {};

    if (!module || !title) {
      return res.status(400).json({ error: "module and title are required" });
    }

    const documentModule = String(module).toUpperCase();
    if (!ensureDocumentWrite(req, res, documentModule, req.body)) return;

    const inferredUploader = inferUserId(req, uploaderId);
    const uploader = toBigInt(inferredUploader, "uploaderId", { optional: true });
    const normalizedNotes =
      typeof notes === "string" ? notes.trim().slice(0, 2000) : null;
    const doc = await prisma.document.create({
      data: {
        module: documentModule,
        title,
        storageKey,
        mimeType,
        size,
        checksum,
        notes: normalizedNotes || null,
        uploaderId: uploader,
        projectId: toBigInt(projectId, "projectId", { optional: true }),
        poId: toBigInt(poId, "poId", { optional: true }),
        receiptId: toBigInt(receiptId, "receiptId", { optional: true }),
        deliveryId: toBigInt(deliveryId, "deliveryId", { optional: true }),
        assetId: toBigInt(assetId, "assetId", { optional: true }),
        woId: toBigInt(woId, "woId", { optional: true }),
      },
    });

    await prisma.docVersion.create({
      data: {
        documentId: doc.id,
        versionNo: 1,
        storageKey: storageKey || `placeholder:${doc.id}`,
        size: size || 0,
        checksum: checksum || null,
        createdById: uploader,
      },
    });

    await prisma.docAccessAudit.create({
      data: {
        documentId: doc.id,
        userId: uploader,
        action: "CREATE",
        ip: req.ip || null,
        userAgent: req.get("user-agent") || null,
      },
    });

    res.status(201).json(doc);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const {
      module,
      projectId,
      poId,
      receiptId,
      deliveryId,
      assetId,
      woId,
      q,
      skip = 0,
      take = 50,
    } = req.query;

    const where = {
      module: module ? String(module).toUpperCase() : undefined,
      projectId: projectId ? toBigInt(projectId, "projectId", { optional: true }) : undefined,
      poId: poId ? toBigInt(poId, "poId", { optional: true }) : undefined,
      receiptId: receiptId ? toBigInt(receiptId, "receiptId", { optional: true }) : undefined,
      deliveryId: deliveryId ? toBigInt(deliveryId, "deliveryId", { optional: true }) : undefined,
      assetId: assetId ? toBigInt(assetId, "assetId", { optional: true }) : undefined,
      woId: woId ? toBigInt(woId, "woId", { optional: true }) : undefined,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const scopeFilters = buildDocumentScopeFilters(req.user);
    if (Array.isArray(scopeFilters)) {
      if (scopeFilters.length === 0) {
        return res.status(403).json({ error: "No document scope access configured" });
      }
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: scopeFilters }];
    }

    const rows = await prisma.document.findMany({
      where,
      include: { tags: true },
      orderBy: { createdAt: "desc" },
      skip: Number(skip),
      take: Math.min(Number(take), 200),
    });
    res.json(rows);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[GET /documents]", e);
    res.status(500).json({ error: "Internal error" });
  }
});



router.get("/pending-signatures", managerOnly, async (_req, res) => {
  try {
    const docs = await prisma.document.findMany({
      where: { signatures: { some: { storageKey: null } } },
      include: {
        tags: true,
        signatures: {
          where: { storageKey: null },
          orderBy: { signedAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    res.json(
      docs.map((doc) => ({
        id: doc.id.toString(),
        title: doc.title,
        module: doc.module,
        notes: doc.notes,
        storageKey: doc.storageKey,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        projectId: doc.projectId ? doc.projectId.toString() : null,
        poId: doc.poId ? doc.poId.toString() : null,
        receiptId: doc.receiptId ? doc.receiptId.toString() : null,
        deliveryId: doc.deliveryId ? doc.deliveryId.toString() : null,
        assetId: doc.assetId ? doc.assetId.toString() : null,
        woId: doc.woId ? doc.woId.toString() : null,
        tags: doc.tags.map((tag) => tag.name),
        pendingSignatures: doc.signatures.map((sig) => ({
          id: sig.id.toString(),
          signerId: sig.signerId ? sig.signerId.toString() : null,
          method: sig.method,
          signedAt: sig.signedAt,
          storageKey: sig.storageKey,
          ip: sig.ip,
        })),
      }))
    );
  } catch (e) {
    console.error("[GET /documents/pending-signatures]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/:id/versions", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const doc = await loadDocumentForRequest(req, res, id);
    if (!doc) return;

    const versions = await prisma.docVersion.findMany({
      where: { documentId: id },
      orderBy: { versionNo: "desc" },
    });
    res.json(
      versions.map((v) => ({
        id: v.id.toString(),
        documentId: v.documentId.toString(),
        versionNo: v.versionNo,
        storageKey: v.storageKey,
        size: v.size,
        checksum: v.checksum,
        createdAt: v.createdAt,
        createdById: v.createdById ? v.createdById.toString() : null,
      }))
    );
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[GET /documents/:id/versions]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/:id/versions", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const doc = await loadDocumentForRequest(req, res, id);
    if (!doc) return;

    const { storageKey, size, checksum, createdById, mimeType } = req.body || {};
    if (!storageKey) return res.status(400).json({ error: "storageKey is required" });

    const latest = await prisma.docVersion.findFirst({
      where: { documentId: id },
      orderBy: { versionNo: "desc" },
    });
    const nextVersion = (latest?.versionNo || 0) + 1;

    const created = await prisma.docVersion.create({
      data: {
        documentId: id,
        versionNo: nextVersion,
        storageKey,
        size: size ?? null,
        checksum: checksum ?? null,
        createdById: toBigInt(inferUserId(req, createdById), "createdById", { optional: true }),
      },
    });

    await prisma.document.update({
      where: { id },
      data: {
        storageKey,
        size: size ?? doc.size,
        mimeType: mimeType ?? doc.mimeType,
        checksum: checksum ?? doc.checksum,
        updatedAt: new Date(),
      },
    });

    res.status(201).json({
      id: created.id.toString(),
      documentId: created.documentId.toString(),
      versionNo: created.versionNo,
      storageKey: created.storageKey,
      size: created.size,
      checksum: created.checksum,
      createdAt: created.createdAt,
      createdById: created.createdById ? created.createdById.toString() : null,
    });
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents/:id/versions]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/:id/tags", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const doc = await loadDocumentForRequest(req, res, id);
    if (!doc) return;

    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    const tag = await prisma.docTag.create({ data: { documentId: id, name } });
    res.status(201).json(tag);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents/:id/tags]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/:id/signatures", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const doc = await loadDocumentForRequest(req, res, id);
    if (!doc) return;

    const { signerId, method, storageKey, ip, payload, signature, certificate } = req.body || {};
    const normalizedMethod = String(method || "").toUpperCase();

    if (!ALLOWED_SIGNATURE_METHODS.has(normalizedMethod)) {
      return res.status(400).json({ error: "Unsupported signature method" });
    }

    if (!storageKey || storageKey.startsWith("placeholder:")) {
      return res.status(400).json({ error: "storageKey must reference stored signature media" });
    }

    let verification = { valid: true, digest: null, thumbprint: null };
    if (normalizedMethod === "PKI") {
      if (!payload || !signature || !certificate) {
        return res.status(400).json({ error: "payload, signature, and certificate are required for PKI" });
      }
      verification = verifyPkiSignature(payload, signature, certificate);
      if (!verification.valid) {
        return res.status(400).json({ error: "Digital signature verification failed" });
      }
    }

    const inferredSigner = inferUserId(req, signerId);
    const sig = await prisma.docSignature.create({
      data: {
        documentId: id,
        signerId: toBigInt(inferredSigner, "signerId", { optional: true }),
        method: normalizedMethod,
        storageKey,
        ip: ip || req.ip || null,
      },
    });

    await prisma.docAccessAudit.create({
      data: {
        documentId: id,
        userId: toBigInt(inferredSigner, "signerId", { optional: true }),
        action: "SIGN",
        ip: ip || req.ip || null,
        userAgent: req.get("user-agent") || null,
      },
    });

    res.status(201).json({
      id: sig.id.toString(),
      documentId: sig.documentId.toString(),
      signerId: sig.signerId ? sig.signerId.toString() : null,
      method: sig.method,
      signedAt: sig.signedAt,
      storageKey: sig.storageKey,
      ip: sig.ip,
      verification,
    });
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents/:id/signatures]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/:id/audit", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const doc = await loadDocumentForRequest(req, res, id);
    if (!doc) return;

    const { userId, action, ip, userAgent } = req.body || {};
    const actionUpper = String(action || "").toUpperCase();
    if (!ALLOWED_AUDIT_ACTIONS.has(actionUpper)) {
      return res.status(400).json({ error: "Unsupported audit action" });
    }

    const inferred = inferUserId(req, userId);
    const audit = await prisma.docAccessAudit.create({
      data: {
        documentId: id,
        userId: toBigInt(inferred, "userId", { optional: true }),
        action: actionUpper,
        ip: ip || req.ip || null,
        userAgent: userAgent || req.get("user-agent") || null,
      },
    });
    res.status(201).json(audit);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents/:id/audit]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/:id/audit", managerOnly, async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const entries = await prisma.docAccessAudit.findMany({
      where: { documentId: id },
      orderBy: { occurredAt: "desc" },
      take: 500,
    });

    res.json(
      entries.map((entry) => ({
        id: entry.id.toString(),
        documentId: entry.documentId.toString(),
        userId: entry.userId ? entry.userId.toString() : null,
        action: entry.action,
        occurredAt: entry.occurredAt,
        ip: entry.ip,
        userAgent: entry.userAgent,
      }))
    );
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[GET /documents/:id/audit]", e);
    res.status(500).json({ error: "Internal error" });
  }
});



router.get("/:id/detail", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const doc = await loadDocumentForRequest(req, res, id);
    if (!doc) return;

    const [tags, versions, signatures, audits] = await Promise.all([
      prisma.docTag.findMany({ where: { documentId: id }, orderBy: { name: "asc" } }),
      prisma.docVersion.findMany({ where: { documentId: id }, orderBy: { versionNo: "desc" } }),
      prisma.docSignature.findMany({
        where: { documentId: id },
        orderBy: [{ storageKey: "asc" }, { signedAt: "desc" }],
      }),
      prisma.docAccessAudit.findMany({
        where: { documentId: id },
        orderBy: { occurredAt: "desc" },
        take: 200,
      }),
    ]);

    res.json({
      document: {
        id: doc.id.toString(),
        title: doc.title,
        module: doc.module,
        notes: doc.notes,
        storageKey: doc.storageKey,
        mimeType: doc.mimeType,
        size: doc.size,
        checksum: doc.checksum,
        uploaderId: doc.uploaderId ? doc.uploaderId.toString() : null,
        projectId: doc.projectId ? doc.projectId.toString() : null,
        poId: doc.poId ? doc.poId.toString() : null,
        receiptId: doc.receiptId ? doc.receiptId.toString() : null,
        deliveryId: doc.deliveryId ? doc.deliveryId.toString() : null,
        assetId: doc.assetId ? doc.assetId.toString() : null,
        woId: doc.woId ? doc.woId.toString() : null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      tags: tags.map((tag) => ({
        id: tag.id.toString(),
        name: tag.name,
      })),
      versions: versions.map((version) => ({
        id: version.id.toString(),
        versionNo: version.versionNo,
        storageKey: version.storageKey,
        size: version.size,
        checksum: version.checksum,
        createdAt: version.createdAt,
        createdById: version.createdById ? version.createdById.toString() : null,
      })),
      signatures: signatures.map((sig) => ({
        id: sig.id.toString(),
        signerId: sig.signerId ? sig.signerId.toString() : null,
        method: sig.method,
        signedAt: sig.signedAt,
        storageKey: sig.storageKey,
        ip: sig.ip,
      })),
      audits: audits.map((entry) => ({
        id: entry.id.toString(),
        action: entry.action,
        occurredAt: entry.occurredAt,
        userId: entry.userId ? entry.userId.toString() : null,
        ip: entry.ip,
        userAgent: entry.userAgent,
      })),
    });
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[GET /documents/:id/detail]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/reports/missing", managerOnly, async (req, res) => {
  try {
    const module = String(req.query.module || "").toUpperCase();
    if (!module || !REQUIRED_DOCS[module]) {
      return res.status(400).json({ error: "Unsupported module or missing module parameter" });
    }

    const scopeField = MODULE_SCOPE_FIELD[module];
    if (!scopeField) {
      return res.status(400).json({ error: `Module ${module} does not support missing-doc reports yet` });
    }

    const scopeValue = req.query[scopeField];
    const scopeId = toBigInt(scopeValue, scopeField);

    const docs = await prisma.document.findMany({
      where: {
        module,
        [scopeField]: scopeId,
      },
      include: { tags: true },
      orderBy: { createdAt: "asc" },
    });

    const presentTags = new Set();
    for (const doc of docs) {
      for (const tag of doc.tags) {
        presentTags.add(tag.name.toUpperCase());
      }
    }

    const requirements = REQUIRED_DOCS[module];
    const missing = requirements.filter((reqItem) => !presentTags.has(reqItem.tag.toUpperCase()));

    res.json({
      module,
      scopeField,
      scopeId: scopeId.toString(),
      required: requirements,
      missing,
      present: docs.map((doc) => ({
        id: doc.id.toString(),
        title: doc.title,
        tags: doc.tags.map((t) => t.name),
        storageKey: doc.storageKey,
        createdAt: doc.createdAt,
      })),
    });
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[GET /documents/reports/missing]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;

