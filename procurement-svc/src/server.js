import express from "express";
import cors from "cors";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

// --- BigInt -> JSON (avoid "Do not know how to serialize a BigInt")
BigInt.prototype.toJSON = function () { return this.toString(); };

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const INVENTORY_BASE = process.env.INVENTORY_BASE_URL || "http://localhost:4001/api/v1";

// Health
app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

// Seed demo supplier + PO + line (itemId to be set later)
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

// Set POLine.itemId to real Inventory Item.id
app.post("/api/v1/polines/:id/item/:itemId", async (req, res) => {
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
app.get("/api/v1/ping-inventory", async (_req, res) => {
  try {
    const r = await axios.get(`${INVENTORY_BASE}/health`, { timeout: 5000 });
    res.status(r.status).json({ ok: true, status: r.status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// Create GRN and post receipts to Inventory; rollback on failure
app.post("/api/v1/grns", async (req, res) => {
  const body = req.body;

  // Basic validation
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
      // Ensure PO exists
      const po = await txp.purchaseOrder.findUnique({ where: { id: BigInt(body.poId) } });
      if (!po) throw new Error("PO not found");

      // Create GRN header
      const grn = await txp.grn.create({
        data: { grnNo: `GRN-${Date.now()}`, poId: po.id, receivedAt: new Date() }
      });

      for (const ln of body.lines) {
        const poLineId = BigInt(ln.poLineId);

        // Validate PO line
        const pol = await txp.purchaseOrderLine.findUnique({ where: { id: poLineId } });
        if (!pol) throw new Error(`PO line not found: ${ln.poLineId}`);

        // Optional: enforce not over-receiving
        const remaining = Number(pol.qtyOrdered) - Number(pol.qtyReceived);
        if (Number(ln.qtyReceived) > remaining) {
          throw new Error(`Qty received exceeds remaining for PO line ${ln.poLineId}`);
        }

        // Create GRN line
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

        // Call Inventory /receipts
        const payload = {
          itemId: ln.itemId,
          qty: ln.qtyReceived,
          uomCode: ln.uomCode,
          locationId: ln.locationId,
          binId: ln.binId ?? null,
          lotNo: ln.lotNo,
          expiryDate: ln.expiryDate ?? null,
          referenceTable: "grn_lines",
          referenceId: Number(grn.id)   // opaque reference for traceability
        };

        const r = await axios.post(`${INVENTORY_BASE}/receipts`, payload, { timeout: 8000 });
        if (r.status >= 300) throw new Error(`Inventory error ${r.status}`);

        // Update PO line received qty locally
        await txp.purchaseOrderLine.update({
          where: { id: pol.id },
          data: { qtyReceived: Number(pol.qtyReceived) + Number(ln.qtyReceived) }
        });
      }

      // Optional: update PO status to PARTIALLY_RECEIVED or CLOSED
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
    // 502 → bad gateway if upstream (inventory) failed; 500 otherwise
    const isUpstream = /Inventory error|ECONNREFUSED|ECONNRESET|timeout/i.test(String(e.message));
    res.status(isUpstream ? 502 : 500).json({ message: "Failed to post GRN", error: String(e.message || e) });
  }
});

// --- Boot
const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`procurement-svc listening on ${PORT}`));
