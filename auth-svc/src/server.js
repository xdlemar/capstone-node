import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const app = express();

const PORT        = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const JWT_SECRET  = process.env.JWT_SECRET  || "supersecret_dev_only";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: "Invalid token" }); }
}

app.get("/api/v1/health", (_req,res)=>res.json({ ok:true }));


app.post("/api/v1/auth/dev-seed", async (_req,res)=>{
  try {
    const users = [
      { email:"admin@hvh.local", name:"HVH Admin", role:"ADMIN", password:"admin123" },
      { email:"staff@hvh.local", name:"HVH Staff", role:"STAFF", password:"staff123" },
      { email:"it@hvh.local",    name:"HVH IT",    role:"IT",    password:"it123" },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, passwordHash: hash },
        create: { email: u.email, name: u.name, role: u.role, passwordHash: hash }
      });
    }
    res.json({ ok:true });
  } catch(e){ console.error(e); res.status(500).json({ message:String(e.message||e) }); }
});


app.post("/api/v1/auth/register", async (req,res)=>{
  const { email, name, password, role="STAFF" } = req.body || {};
  if(!email || !name || !password) return res.status(422).json({ message:"email, name, password required" });
  const exists = await prisma.user.findUnique({ where:{ email }});
  if (exists) return res.status(409).json({ message:"email already registered" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data:{ email, name, role, passwordHash: hash }});
  const token = signToken(user);
  res.status(201).json({ token, user:{ id:Number(user.id), email:user.email, name:user.name, role:user.role }});
});

// Login
app.post("/api/v1/auth/login", async (req,res)=>{
  const { email, password } = req.body || {};
  if(!email || !password) return res.status(422).json({ message:"email and password required" });

  const user = await prisma.user.findUnique({ where:{ email }});
  if(!user) return res.status(401).json({ message:"Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if(!ok) return res.status(401).json({ message:"Invalid credentials" });

  const token = signToken(user);
  res.json({ token, user:{ id:Number(user.id), email:user.email, name:user.name, role:user.role }});
});

// Me
app.get("/api/v1/auth/me", authRequired, (req,res)=>res.json({ user: req.user }));

app.listen(PORT, ()=> console.log(`auth-svc listening on ${PORT}`));
