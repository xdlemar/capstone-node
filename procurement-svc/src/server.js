const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();

const pr = require("./routes/pr");
const po = require("./routes/po");
const rcv = require("./routes/receipts");
const att = require("./routes/attachments");
const lookups = require("./routes/lookups");
const ven = require("./routes/vendors");
const { authRequired, requireRole } = require("./auth");

const app = express();
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

// Public health endpoint
app.get("/health", (_req, res) => res.json({ ok: true, svc: "procurement" }));

app.use(authRequired);
app.use(requireRole("STAFF", "MANAGER", "ADMIN"));

// Mount routes at ROOT to match gateway path rewrite
app.use(pr);
app.use(po);
app.use(rcv);
app.use(att);
app.use("/lookups", lookups);
app.use(ven);

const port = Number(process.env.PORT || 4002);
app.listen(port, () => console.log(`procurement-svc on http://localhost:${port}`));
