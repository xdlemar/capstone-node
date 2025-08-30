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
    STAFF:["plt.view","plt.write"],
    IT:["plt.view"]
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

app.get("/api/v1/projects", authRequired, requirePerm("plt.view"), async (_req,res)=>{
  const rows = await prisma.project.findMany({ orderBy:{ id:"asc" }});
  res.json(rows);
});
app.post("/api/v1/projects", authRequired, requirePerm("plt.write"), async (req,res)=>{
  const { code, name, ownerDept=null, startDate=null, endDate=null } = req.body || {};
  if(!code || !name) return res.status(422).json({message:"code and name required"});
  const row = await prisma.project.create({
    data:{ code, name, ownerDept,
      startDate: startDate? new Date(startDate): null,
      endDate: endDate? new Date(endDate): null
    }
  });
  res.status(201).json({ id:Number(row.id) });
});

app.get("/api/v1/projects/:id/tasks", authRequired, requirePerm("plt.view"), async (req,res)=>{
  const rows = await prisma.projectTask.findMany({
    where:{ projectId: BigInt(req.params.id) }, orderBy:{ id:"asc" }
  });
  res.json(rows);
});
app.post("/api/v1/projects/:id/tasks", authRequired, requirePerm("plt.write"), async (req,res)=>{
  const { title, dueDate=null, assignedTo=null } = req.body || {};
  if(!title) return res.status(422).json({message:"title required"});
  const row = await prisma.projectTask.create({
    data:{ projectId: BigInt(req.params.id), title,
      dueDate: dueDate? new Date(dueDate): null, assignedTo }
  });
  res.status(201).json({ id:Number(row.id) });
});

const PORT = process.env.PORT || 4005;
app.listen(PORT, ()=>console.log(`plt-svc listening on ${PORT}`));
