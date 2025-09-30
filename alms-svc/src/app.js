const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { authRequired, requireRole } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");
const managerAccess = requireRole("MANAGER", "ADMIN");
const adminOnly = requireRole("ADMIN");

app.get("/health", (_req, res) => res.json({ ok: true, svc: "alms" }));

app.use(authRequired);
app.use(staffAccess);

app.use("/assets", adminOnly, require("./routes/assets"));
app.use("/workorders", staffAccess, require("./routes/workorders"));
app.use("/schedules", managerAccess, require("./routes/schedules"));
app.use("/repairs", staffAccess, require("./routes/repairs"));
app.use("/transfers", managerAccess, require("./routes/transfers"));
app.use("/disposals", managerAccess, require("./routes/disposals"));
app.use("/alerts", managerAccess, require("./routes/alerts"));
app.use("/dashboard", require("./routes/dashboard"));
app.use("/financial", managerAccess, require("./routes/financial"));

module.exports = app;

