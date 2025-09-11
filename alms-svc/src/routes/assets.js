const router = require("express").Router();
const { prisma } = require("../prisma");

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const {
      assetCode, itemId, serialNo, category,
      purchaseDate, acquisitionCost, vendorId,
      warrantyUntil, status, locationId, notes
    } = req.body;

    const row = await prisma.asset.create({
      data: {
        assetCode,
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
      }
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
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
        where, orderBy: { createdAt: "desc" },
        skip: Number(skip), take: Math.min(Number(take), 200)
      }),
      prisma.asset.count({ where })
    ]);

    res.json({ total, rows });
  } catch (e) { next(e); }
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
  } catch (e) { next(e); }
});

// UPDATE (PUT – full, PATCH – partial)
router.put("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const {
      assetCode, itemId, serialNo, category,
      purchaseDate, acquisitionCost, vendorId,
      warrantyUntil, status, locationId, notes
    } = req.body;

    const row = await prisma.asset.update({
      where: { id },
      data: {
        assetCode,
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
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const d = {};
    const set = (k,v)=>{ if (v !== undefined) d[k]=v; };
    const setBig = (k,v)=>{ if (v !== undefined) d[k]= (v===null? null : BigInt(v)); };
    const setDate = (k,v)=>{ if (v !== undefined) d[k]= (v===null? null : new Date(v)); };

    set("assetCode", req.body.assetCode);
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
  } catch (e) { next(e); }
});

// NOTE: no DELETE endpoint (use status RETIRED/DISPOSED instead)
module.exports = router;
