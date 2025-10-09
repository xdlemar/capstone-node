const router = require("express").Router();
const crypto = require("crypto");
const { prisma } = require("../prisma");

function hasManagerRights(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.includes("MANAGER") || roles.includes("ADMIN");
}

function ensureManager(req, res, next) {
  if (!hasManagerRights(req.user)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

const ASSET_CODE_PREFIX = process.env.ASSET_CODE_PREFIX || "EQ-";
const MAX_CODE_ATTEMPTS = Number(process.env.ASSET_CODE_ATTEMPTS || 5);

function generateAssetCodeCandidate() {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${ASSET_CODE_PREFIX}${random}`;
}
// CREATE
router.post("/", ensureManager, async (req, res, next) => {
  try {
    const {
      assetCode,
      name,
      itemId,
      serialNo,
      category,
      purchaseDate,
      acquisitionCost,
      vendorId,
      warrantyUntil,
      status,
      locationId,
      notes,
    } = req.body || {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    let candidateCode = typeof assetCode === "string" ? assetCode.trim() : "";

    const commonData = {
      itemId: itemId ? BigInt(itemId) : null,
      serialNo: serialNo || null,
      category: category || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      acquisitionCost: acquisitionCost ?? null,
      vendorId: vendorId ? BigInt(vendorId) : null,
      warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
      status: status || "ACTIVE",
      locationId: locationId ? BigInt(locationId) : null,
      notes: notes || null
    };

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = candidateCode || generateAssetCodeCandidate();
      try {
        const row = await prisma.asset.create({
          data: {
            ...commonData,
            assetCode: code,
            name: trimmedName || code
          }
        });
        return res.status(201).json(row);
      } catch (err) {
        if (err?.code === "P2002" && err?.meta?.target?.includes("assetCode")) {
          if (candidateCode) {
            return res.status(409).json({ error: "Asset code already exists" });
          }
          candidateCode = "";
          continue;
        }
        console.error("[POST /assets]", err);
        return next(err);
      }
    }

    console.error("[POST /assets] exhausted asset code attempts");
    return res.status(500).json({ error: "Failed to generate a unique asset code" });
  } catch (e) {
    console.error("[POST /assets]", e);
    next(e);
  }
});

// LIST + filters + pagination
router.get("/", async (req, res, next) => {
  try {
    const { q, status, locationId, skip=0, take=50 } = req.query;
    const where = {
      status: status || undefined,
      locationId: locationId ? BigInt(locationId) : undefined,
      ...(q ? { OR: [
        { assetCode: { contains: q, mode: "insensitive" } },
        { serialNo:  { contains: q, mode: "insensitive" } },
        { category:  { contains: q, mode: "insensitive" } },
        { notes:     { contains: q, mode: "insensitive" } }
      ]} : {})
    };

    const [rows, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: [
          { status: "asc" },
          { name: "asc" },
        ],
        skip: Number(skip),
        take: Math.min(Number(take), 200),
      }),
      prisma.asset.count({ where })
    ]);

    res.json({ total, rows });
  } catch (e) {
    console.error("[GET /assets]", e);
    next(e);
  }
});

// READ by id
router.get("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const row = await prisma.asset.findUnique({
      where: { id },
      include: {
        depreciation: true,
        workOrders:   { orderBy: { createdAt: "desc" }, take: 10 },
        transfers:    { orderBy: { movedAt: "desc" },   take: 10 },
        repairs:      { orderBy: { repairedAt: "desc" },take: 10 },
        disposal:     true
      }
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error("[GET /assets/:id]", e);
    next(e);
  }
});

// UPDATE (PUT – full, PATCH – partial)
router.put("/:id", ensureManager, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const {
      assetCode,
      name,
      itemId,
      serialNo,
      category,
      purchaseDate,
      acquisitionCost,
      vendorId,
      warrantyUntil,
      status,
      locationId,
      notes,
    } = req.body || {};

    const finalName = (name || assetCode || "").trim();

    const row = await prisma.asset.update({
      where: { id },
      data: {
        assetCode,
        name: finalName || null,
        itemId: itemId != null ? BigInt(itemId) : null,
        serialNo: serialNo ?? null,
        category: category ?? null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        acquisitionCost: acquisitionCost ?? null,
        vendorId: vendorId != null ? BigInt(vendorId) : null,
        warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
        status,
        locationId: locationId != null ? BigInt(locationId) : null,
        notes: notes ?? null
      }
    });
    res.json(row);
  } catch (e) {
    console.error("[PUT /assets/:id]", e);
    next(e);
  }
});

router.patch("/:id", ensureManager, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const d = {};
    const set = (k,v)=>{ if (v !== undefined) d[k]=v; };
    const setBig = (k,v)=>{ if (v !== undefined) d[k]= (v===null? null : BigInt(v)); };
    const setDate = (k,v)=>{ if (v !== undefined) d[k]= (v===null? null : new Date(v)); };

    set("assetCode", req.body.assetCode);
    set("name", req.body.name);
    setBig("itemId", req.body.itemId);
    set("serialNo", req.body.serialNo ?? undefined);
    set("category", req.body.category ?? undefined);
    setDate("purchaseDate", req.body.purchaseDate);
    set("acquisitionCost", req.body.acquisitionCost);
    setBig("vendorId", req.body.vendorId);
    setDate("warrantyUntil", req.body.warrantyUntil);
    set("status", req.body.status);
    setBig("locationId", req.body.locationId);
    set("notes", req.body.notes ?? undefined);

    const row = await prisma.asset.update({ where: { id }, data: d });
    res.json(row);
  } catch (e) {
    console.error("[PUT /assets/:id]", e);
    next(e);
  }
});

// NOTE: no DELETE endpoint (use status RETIRED/DISPOSED instead)
module.exports = router;




