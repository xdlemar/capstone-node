const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const vendors = require("./routes/vendors");
const pr = require("./routes/pr");
const po = require("./routes/po");
const receipts = require("./routes/receipts");

const app = express();

// BigInt-safe JSON
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, svc: "procurement" }));

app.use("/vendors", vendors);
app.use("/pr", pr);
app.use("/po", po);
app.use("/receipts", receipts);

app.use((err, _req, res, _next) => {
  console.error("[unhandled-error]", err);
  res.status(500).json({ error: "Internal error" });
});

const port = Number(process.env.PORT || 4002);
app.listen(port, () => console.log(`procurement-svc on http://localhost:${port}`));
