const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

r.post("/", async (req, res) => {
  const { name, kind } = req.body;
  const loc = await prisma.location.create({ data: { name, kind } });
  res.status(201).json(loc);
});

r.get("/", async (_req, res) => {
  const locs = await prisma.location.findMany({ orderBy: { name: "asc" } });
  res.json(locs);
});

module.exports = r;
