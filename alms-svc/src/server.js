import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

BigInt.prototype.toJSON = function () { return this.toString(); };

const prisma = new PrismaClient();
const app = express();

const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev";

// ---- auth (trust auth-svc) ----
function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); }
  catch { return res.status(401).json({ message: "Invalid token" }); }
}
const ROLE = { ADMIN: "ADMIN", STAFF: "STAFF", IT: "IT" };
const can = (role, perm) => {
  const matrix = {
    ADMIN: ["*"],
    STAFF: ["alms.view","alms.asset.write","alms.maint.write"],
    IT:    ["alms.view"]
  };
  return matrix[role]?.includes("*") || matrix[role]?.includes(perm);
};
const requirePerm = (perm) => (req,res,next)=>{
  const role = req.user?.role;
  if(!role) return res.status(401).json({message:"Unauthorized"});
  if(!can(role, perm)) return res.status(403).json({message:"Forbidden"});
  next();
};

// ---- health ----
app.get("/api/v1/health", (_req,res)=>res.json({ok:true}));

// ---- seed (demo) ----
app.post("/api/v1/seed", authRequired, async (_req,res)=>{
  const a = await prisma.asset.upsert({
    where:{ tag:"AST-1001" }, update:{},
    create:{ tag:"AST-1001", name:"Vaccine Refrigerator", category:"Cold Chain" }
  });
  res.json({ assetId: Number(a.id) });
});

// ---- Assets ----
app.get("/api/v1/assets", authRequired, requirePerm("alms.view"), async (_req,res)=>{
  const rows = await prisma.asset.findMany({ orderBy:{ id:"asc" }});
  res.json(rows.map(a=>({
    id:Number(a.id), tag:a.tag, name:a.name, category:a.category,
    locationId: a.locationId? Number(a.locationId): null,
    status:a.status, createdAt:a.createdAt
  })));
});

app.post("/api/v1/assets", authRequired, requirePerm("alms.asset.write"), async (req,res)=>{
  const { tag, name, category=null, locationId=null } = req.body || {};
  if(!tag || !name) return res.status(422).json({message:"tag and name required"});
  const row = await prisma.asset.create({
    data: { tag, name, category, locationId: locationId? BigInt(locationId): null }
  });
  res.status(201).json({ id:Number(row.id) });
});

app.patch("/api/v1/assets/:id/status", authRequired, requirePerm("alms.asset.write"), async (req,res)=>{
  const { status } = req.body || {};
  if(!status) return res.status(422).json({message:"status required"});
  const row = await prisma.asset.update({
    where:{ id: BigInt(req.params.id) },
    data:{ status }
  });
  res.json({ id:Number(row.id), status: row.status });
});

// ---- Maintenance ----
app.get("/api/v1/assets/:id/maint", authRequired, requirePerm("alms.view"), async (req,res)=>{
  const assetId = BigInt(req.params.id);
  const rows = await prisma.assetMaint.findMany({
    where:{ assetId }, orderBy:{ id:"asc" }
  });
  res.json(rows.map(r=>({
    id:Number(r.id), type:r.type, scheduledAt:r.scheduledAt,
    completedAt:r.completedAt, notes:r.notes
  })));
});

app.post("/api/v1/assets/:id/maint", authRequired, requirePerm("alms.maint.write"), async (req,res)=>{
  const assetId = BigInt(req.params.id);
  const { type, scheduledAt=null, notes=null } = req.body || {};
  if(!type) return res.status(422).json({message:"type required"});
  const row = await prisma.assetMaint.create({
    data:{ assetId, type, scheduledAt: scheduledAt? new Date(scheduledAt): null, notes }
  });
  res.status(201).json({ id:Number(row.id) });
});

app.patch("/api/v1/maint/:maintId/complete", authRequired, requirePerm("alms.maint.write"), async (req,res)=>{
  const row = await prisma.assetMaint.update({
    where:{ id: BigInt(req.params.maintId) },
    data:{ completedAt: new Date() }
  });
  res.json({ id:Number(row.id), completedAt: row.completedAt });
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, ()=>console.log(`alms-svc listening on ${PORT}`));
