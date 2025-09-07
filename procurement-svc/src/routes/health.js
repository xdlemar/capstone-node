const { Router } = require("express");
const r = Router();

r.get("/", (_req, res) => {
  res.json({ ok: true, svc: "procurement" });
});

module.exports = r;
