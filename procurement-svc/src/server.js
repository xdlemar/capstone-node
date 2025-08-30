import express from "express";
import cors from "cors";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

BigInt.prototype.toJSON = function () { return this.toString(); };

const prisma = new PrismaClient();
const app = express();

const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: WEB_ORIGIN, credentials: false }));
app.use(express.json());

const INVENTORY_BASE = process.env.INVENTORY_BASE_URL || "http://localhost:4001/api/v1";
const JWT_SECRET = process.env.JWT_SECRET || "dev"; // MUST match auth-svc

// ---- RBAC (no DB users here, trust JWT.role) ----
const ROLE_MATRIX = {
  ADMIN: ["*"],
  STAFF: [
    "procurement.view","grn.create"
  ],
  IT: ["procurement.view"]
};
const hasPerm = (role, perm) => (ROLE_MATRIX[role]?.includes("*") || ROLE_MATRIX[role]?.includes(perm)) ?? false;

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); }
  catch { return res.status(401).json({ message: "Invalid token" }); }
}
const requirePerm = (perm) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ message: "Unauthorized" });
  if (!hasPerm(role, perm)) return res.status(403).json({ message: "Forbidden" });
  next();
};

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

// Seed sample supplier/PO/line (demo only)
app.post("/api/v1/seed", async (_req, res) => {
  try {
    const sup = await prisma.supplier.upsert({
      where: { code: "SUP-001" },
      update: {},
      create: { code: "SUP-001", name: "Demo Supplier" }
    });
    const po = await prisma.purchaseOrder.upsert({
      where: { poNo: "PO-1001" },
      update: {},
      create: { poNo: "PO-1001", supplierId: sup.id, status: "APPROVED" }
    });
    const pol = await prisma.purchaseOrderLine.create({
      data: { poId: po.id, itemId: 0n, qtyOrdered: 100, price: 0 }
    });
    res.json({ supplierId: sup.id, poId: po.id, poLineId: pol.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Seed failed", error: String(e.message || e) });
  }
});

// Link a PO line to an inventory itemId (requires procurement.view)
app.post("/api/v1/polines/:id/item/:itemId", authRequired, requirePerm("procurement.view"), async (req, res) => {
  try {
    const pol = await prisma.purchaseOrderLine.update({
      where: { id: BigInt(req.params.id) },
      data: { itemId: BigInt(req.params.itemId) }
    });
    res.json(pol);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Update POLine failed", error: String(e.message || e) });
  }
});

// Ping Inventory
app.get("/api/v1/ping-inventory", authRequired, async (_req, res) => {
  try {
    const r = await axios.get(`${INVENTORY_BASE}/health`, { timeout: 5000 });
    res.status(r.status).json({ ok: true, status: r.status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// Create GRN + post receipts to Inventory (requires grn.create)
app.post("/api/v1/grns", authRequired, requirePerm("grn.create"), async (req, res) => {
  const body = req.body;
  if (!body?.poId || !Array.isArray(body.lines) || body.lines.length === 0) {
    return res.status(422).json({ message: "poId and lines[] are required" });
  }
  for (const ln of body.lines) {
    if (!ln.poLineId || !ln.itemId || !ln.qtyReceived || !ln.uomCode || !ln.lotNo || !ln.locationId) {
      return res.status(422).json({ message: "Each line requires poLineId, itemId, qtyReceived, uomCode, lotNo, locationId" });
    }
  }

  try {
    const result = await prisma.$transaction(async (txp) => {
      const po = await txp.purchaseOrder.findUnique({ where: { id: BigInt(body.poId) } });
      if (!po) throw new Error("PO not found");

      const grn = await txp.grn.create({
        data: { grnNo: `GRN-${Date.now()}`, poId: po.id, receivedAt: new Date() }
      });

      for (const ln of body.lines) {
        const pol = await txp.purchaseOrderLine.findUnique({ where: { id: BigInt(ln.poLineId) } });
        if (!pol) throw new Error(`PO line not found: ${ln.poLineId}`);

        const remaining = Number(pol.qtyOrdered) - Number(pol.qtyReceived);
        if (Number(ln.qtyReceived) > remaining) {
          throw new Error(`Qty received exceeds remaining for PO line ${ln.poLineId}`);
        }

        await txp.grnLine.create({
          data: {
            grnId: grn.id,
            poLineId: pol.id,
            itemId: BigInt(ln.itemId),
            uomCode: ln.uomCode,
            qtyReceived: ln.qtyReceived,
            lotNo: ln.lotNo,
            expiryDate: ln.expiryDate ? new Date(ln.expiryDate) : null,
            locationId: BigInt(ln.locationId),
            binId: ln.binId ? BigInt(ln.binId) : null
          }
        });

        const payload = {
          itemId: ln.itemId,
          qty: ln.qtyReceived,
          uomCode: ln.uomCode,
          locationId: ln.locationId,
          binId: ln.binId ?? null,
          lotNo: ln.lotNo,
          expiryDate: ln.expiryDate ?? null,
          referenceTable: "grn_lines",
          referenceId: Number(grn.id)
        };

        const r = await axios.post(`${INVENTORY_BASE}/receipts`, payload, { timeout: 8000 });
        if (r.status >= 300) throw new Error(`Inventory error ${r.status}`);

        await txp.purchaseOrderLine.update({
          where: { id: pol.id },
          data: { qtyReceived: Number(pol.qtyReceived) + Number(ln.qtyReceived) }
        });
      }

      const lines = await txp.purchaseOrderLine.findMany({ where: { poId: po.id } });
      const allReceived = lines.every(l => Number(l.qtyReceived) >= Number(l.qtyOrdered));
      await txp.purchaseOrder.update({
        where: { id: po.id },
        data: { status: allReceived ? "CLOSED" : "PARTIALLY_RECEIVED" }
      });

      return { grnId: grn.id };
    });

    res.status(201).json(result);
  } catch (e) {
    console.error(e);
    const isUpstream = /Inventory error|ECONNREFUSED|ECONNRESET|timeout/i.test(String(e.message));
    res.status(isUpstream ? 502 : 500).json({ message: "Failed to post GRN", error: String(e.message || e) });
  }
});

// PO views
app.get("/api/v1/pos", authRequired, requirePerm("procurement.view"), async (_req, res) => {
  const pos = await prisma.purchaseOrder.findMany({ select: { id: true, poNo: true, status: true } });
  res.json(pos);
});
app.get("/api/v1/pos/:id/lines", authRequired, requirePerm("procurement.view"), async (req, res) => {
  const poId = BigInt(req.params.id);
  const lines = await prisma.purchaseOrderLine.findMany({
    where: { poId },
    select: { id: true, itemId: true, qtyOrdered: true, qtyReceived: true }
  });
  res.json(lines.map(l => ({
    id: Number(l.id),
    itemId: Number(l.itemId),
    qtyOrdered: Number(l.qtyOrdered),
    qtyReceived: Number(l.qtyReceived),
    remaining: Number(l.qtyOrdered) - Number(l.qtyReceived)
  })));
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`procurement-svc listening on ${PORT}`));
