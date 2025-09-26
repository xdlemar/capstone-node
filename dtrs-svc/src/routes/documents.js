const router = require("express").Router();
const { prisma } = require("../prisma");

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

// create document + initial version
router.post("/", async (req, res) => {
  try {
    const {
      module,
      title,
      storageKey,
      mimeType,
      size,
      checksum,
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

    const uploader = toBigInt(uploaderId, "uploaderId", { optional: true });
    const doc = await prisma.document.create({
      data: {
        module,
        title,
        storageKey,
        mimeType,
        size,
        checksum,
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

    res.status(201).json(doc);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// list/search
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
      module: module || undefined,
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

router.get("/:id/versions", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
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
    const { storageKey, size, checksum, createdById, mimeType } = req.body || {};
    if (!storageKey) return res.status(400).json({ error: "storageKey is required" });

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

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
        createdById: toBigInt(createdById, "createdById", { optional: true }),
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
    const { signerId, method, storageKey, ip } = req.body || {};
    if (!method || !storageKey) {
      return res.status(400).json({ error: "method and storageKey are required" });
    }
    const sig = await prisma.docSignature.create({
      data: {
        documentId: id,
        signerId: toBigInt(signerId, "signerId", { optional: true }),
        method,
        storageKey,
        ip: ip || null,
      },
    });
    res.status(201).json(sig);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents/:id/signatures]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/:id/audit", async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const { userId, action, ip, userAgent } = req.body || {};
    if (!action) return res.status(400).json({ error: "action is required" });
    const audit = await prisma.docAccessAudit.create({
      data: {
        documentId: id,
        userId: toBigInt(userId, "userId", { optional: true }),
        action,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });
    res.status(201).json(audit);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    console.error("[POST /documents/:id/audit]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/reports/missing", async (req, res) => {
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
