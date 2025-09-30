const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { authRequired, requireRole } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

const managerAccess = requireRole("MANAGER", "ADMIN");

app.get("/health", (_req, res) => res.json({ ok: true, svc: "dtrs" }));

app.use(authRequired);
app.use(managerAccess);
app.use("/documents", require("./routes/documents"));
app.use("/dashboard", require("./routes/dashboard"));

module.exports = app;

