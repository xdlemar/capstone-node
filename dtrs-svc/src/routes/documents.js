const router = require("express").Router();
const { prisma } = require("../prisma");

// create document + initial version
router.post("/", async (req, res, next) => {
  try {
    const {
      module, title, storageKey, mimeType, size, checksum,
      uploaderId, projectId, poId, receiptId, deliveryId, assetId, woId
    } = req.body;

    const doc = await prisma.document.create({
      data: {
        module, title, storageKey, mimeType, size, checksum,
        uploaderId: uploaderId ? BigInt(uploaderId) : null,
        projectId:  projectId  ? BigInt(projectId)  : null,
        poId:       poId       ? BigInt(poId)       : null,
        receiptId:  receiptId  ? BigInt(receiptId)  : null,
        deliveryId: deliveryId ? BigInt(deliveryId) : null,
        assetId:    assetId    ? BigInt(assetId)    : null,
        woId:       woId       ? BigInt(woId)       : null
      }
    });

    await prisma.docVersion.create({
      data: {
        documentId: doc.id,
        versionNo: 1,
        storageKey: storageKey || `placeholder:${doc.id}`,
        size: size || 0,
        createdById: uploaderId ? BigInt(uploaderId) : null
      }
    });

    res.status(201).json(doc);
  } catch (e) { next(e); }
});

// list/search
router.get("/", async (req, res, next) => {
  try {
    const { module, projectId, poId, receiptId, deliveryId, assetId, woId, q, skip=0, take=50 } = req.query;
    const where = {
      module: module || undefined,
      projectId: projectId ? BigInt(projectId) : undefined,
      poId:      poId      ? BigInt(poId)      : undefined,
      receiptId: receiptId ? BigInt(receiptId) : undefined,
      deliveryId: deliveryId ? BigInt(deliveryId) : undefined,
      assetId:   assetId   ? BigInt(assetId)   : undefined,
      woId:      woId      ? BigInt(woId)      : undefined,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { tags: { some: { name: { contains: q, mode: "insensitive" } } } }] } : {})
    };
    const rows = await prisma.document.findMany({
      where, include: { tags: true },
      orderBy: { createdAt: "desc" },
      skip: Number(skip), take: Math.min(Number(take), 200)
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/:id/tags", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const tag = await prisma.docTag.create({ data: { documentId: id, name: req.body.name } });
    res.status(201).json(tag);
  } catch (e) { next(e); }
});

router.post("/:id/signatures", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { signerId, method, storageKey, ip } = req.body;
    const sig = await prisma.docSignature.create({
      data: {
        documentId: id,
        signerId: signerId ? BigInt(signerId) : null,
        method, storageKey, ip
      }
    });
    res.status(201).json(sig);
  } catch (e) { next(e); }
});

router.post("/:id/audit", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { userId, action, ip, userAgent } = req.body;
    const audit = await prisma.docAccessAudit.create({
      data: {
        documentId: id,
        userId: userId ? BigInt(userId) : null,
        action, ip, userAgent
      }
    });
    res.status(201).json(audit);
  } catch (e) { next(e); }
});

module.exports = router;
