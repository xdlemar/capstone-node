import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

BigInt.prototype.toJSON = function () { return this.toString(); };
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (req,res)=>res.json({ok:true}));

// Seed minimal masters
app.post("/api/v1/seed", async (req,res)=>{
  const item = await prisma.item.upsert({
    where:{ itemCode:"AMOX-500" }, update:{},
    create:{ itemCode:"AMOX-500", description:"Amoxicillin 500mg Cap", uomCode:"EA" }
  });
  const loc = await prisma.location.upsert({
    where:{ code:"MAIN-PHARM" }, update:{},
    create:{ code:"MAIN-PHARM", name:"Main Pharmacy", type:"PHARMACY" }
  });
  const bin = await prisma.bin.upsert({
    where:{ locationId_code:{ locationId: loc.id, code:"A-01-03" } }, update:{},
    create:{ locationId: loc.id, code:"A-01-03" }
  });
  res.json({ ok:true, itemId: Number(item.id), locationId: Number(loc.id), binId: Number(bin.id) });
});

// Receive stock
app.post("/api/v1/receipts", async (req,res)=>{
  const { itemId, qty, uomCode, locationId, binId=null, lotNo, expiryDate=null, referenceTable=null, referenceId=null } = req.body||{};
  if (!itemId||!qty||!uomCode||!locationId||!lotNo) return res.status(422).json({message:"Missing fields"});
  try {
    const item = await prisma.item.findUnique({ where:{ id: BigInt(itemId) } });
    if (!item) return res.status(422).json({message:"item not found"});

    const lot = await prisma.itemLot.upsert({
      where:{ itemId_lotNo:{ itemId: BigInt(itemId), lotNo } }, update:{},
      create:{ itemId: BigInt(itemId), lotNo, expiryDate: expiryDate? new Date(expiryDate): null }
    });

    const bal = await prisma.inventoryBalance.upsert({
      where:{ itemId_locationId_binId_lotId:{
        itemId: BigInt(itemId), locationId: BigInt(locationId),
        binId: binId? BigInt(binId): null, lotId: lot.id
      }},
      update:{ onHand: { increment: qty } },
      create:{ itemId: BigInt(itemId), locationId: BigInt(locationId), binId: binId? BigInt(binId): null, lotId: lot.id, onHand: qty, reserved: 0 }
    });

    await prisma.inventoryTxn.create({ data:{
      type:"RECEIPT", itemId: BigInt(itemId), qty, uomCode,
      toLocationId: BigInt(locationId), toBinId: binId? BigInt(binId): null,
      lotId: lot.id, referenceTable, referenceId: referenceId? BigInt(referenceId): null
    }});

    res.status(201).json({ balanceId: Number(bal.id), lotId: Number(lot.id) });
  } catch (e) { console.error(e); res.status(500).json({message:String(e.message||e)}); }
});

const PORT = process.env.PORT || 4001;

// List on-hand inventory (optionally filter by item_id, location_id, bin_id)
app.get("/api/v1/inventory", async (req, res) => {
  try {
    const itemId     = req.query.item_id     ? BigInt(req.query.item_id)     : null;
    const locationId = req.query.location_id ? BigInt(req.query.location_id) : null;
    const binId      = req.query.bin_id      ? BigInt(req.query.bin_id)      : null;

    // fetch balances
    const where = {};
    if (itemId) where.itemId = itemId;
    if (locationId) where.locationId = locationId;
    // binId can be null (for location-only balances), so only add if provided
    if (binId !== null && binId !== undefined) where.binId = binId;

    const balances = await prisma.inventoryBalance.findMany({
      where,
      orderBy: [{ itemId: "asc" }, { locationId: "asc" }, { binId: "asc" }, { lotId: "asc" }]
    });

    // pull item + lot metadata in small lookups (keeps it working even if relations aren't defined)
    const itemIds = [...new Set(balances.map(b => b.itemId.toString()))].map(BigInt);
    const lotIds  = [...new Set(balances.map(b => b.lotId?.toString()).filter(Boolean))].map(BigInt);

    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    const lots  = lotIds.length ? await prisma.itemLot.findMany({ where: { id: { in: lotIds } } }) : [];

    const itemById = new Map(items.map(i => [i.id.toString(), i]));
    const lotById  = new Map(lots.map(l => [l.id.toString(), l]));

    const rows = balances.map(b => {
      const i = itemById.get(b.itemId.toString());
      const l = b.lotId ? lotById.get(b.lotId.toString()) : null;
      return {
        balanceId: Number(b.id),
        itemId: Number(b.itemId),
        itemCode: i?.itemCode ?? null,
        description: i?.description ?? null,
        locationId: Number(b.locationId),
        binId: b.binId !== null ? Number(b.binId) : null,
        lotId: b.lotId !== null ? Number(b.lotId) : null,
        lotNo: l?.lotNo ?? null,
        expiryDate: l?.expiryDate ?? null,
        onHand: Number(b.onHand),
        reserved: Number(b.reserved)
      };
    });

    res.json({ data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: String(e.message || e) });
  }
});
app.listen(PORT, ()=>console.log(`inventory-svc on ${PORT}`));
