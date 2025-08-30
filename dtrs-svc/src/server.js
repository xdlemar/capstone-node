import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

BigInt.prototype.toJSON = function () { return this.toString(); };
const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev";
function authRequired(req,res,next){
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ")? h.slice(7): null;
  if(!token) return res.status(401).json({message:"Missing token"});
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); }
  catch { return res.status(401).json({message:"Invalid token"}); }
}
const can = (role, perm)=>{
  const matrix = {
    ADMIN:["*"],
    STAFF:["dtrs.view","dtrs.create","dtrs.move","dtrs.release"],
    IT:["dtrs.view"]
  };
  return matrix[role]?.includes("*") || matrix[role]?.includes(perm);
};
const requirePerm = (p)=>(req,res,next)=>{
  const role = req.user?.role;
  if(!role) return res.status(401).json({message:"Unauthorized"});
  if(!can(role,p)) return res.status(403).json({message:"Forbidden"});
  next();
};

app.get("/api/v1/health", (_req,res)=>res.json({ok:true}));

app.get("/api/v1/documents", authRequired, requirePerm("dtrs.view"), async (_req,res)=>{
  const rows = await prisma.document.findMany({ orderBy:{ id:"asc" }});
  res.json(rows);
});

app.post("/api/v1/documents", authRequired, requirePerm("dtrs.create"), async (req,res)=>{
  const { docNo, title, category=null, ownerDept=null, relatedPoId=null, relatedGrnId=null } = req.body || {};
  if(!docNo || !title) return res.status(422).json({message:"docNo and title required"});
  const row = await prisma.document.create({ data:{ docNo, title, category, ownerDept, relatedPoId, relatedGrnId }});
  res.status(201).json({ id:Number(row.id) });
});

app.get("/api/v1/documents/:id/moves", authRequired, requirePerm("dtrs.view"), async (req,res)=>{
  const rows = await prisma.documentMove.findMany({
    where:{ docId: BigInt(req.params.id) }, orderBy:{ id:"asc" }
  });
  res.json(rows);
});

app.post("/api/v1/documents/:id/moves", authRequired, requirePerm("dtrs.move"), async (req,res)=>{
  const { action, from=null, to=null } = req.body || {};
  if(!action) return res.status(422).json({message:"action required"});
  const mv = await prisma.documentMove.create({
    data:{ docId: BigInt(req.params.id), action, from, to, by: req.user?.email || null }
  });
  res.status(201).json({ id:Number(mv.id) });
});

app.patch("/api/v1/documents/:id/status", authRequired, requirePerm("dtrs.release"), async (req,res)=>{
  const { status } = req.body || {};
  const doc = await prisma.document.update({
    where:{ id: BigInt(req.params.id) }, data:{ status }
  });
  res.json({ id:Number(doc.id), status: doc.status });
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, ()=>console.log(`dtrs-svc listening on ${PORT}`));
