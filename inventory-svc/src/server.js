const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const items = require("./routes/items");
const locations = require("./routes/locations");
const batches = require("./routes/batches");
const moves = require("./routes/stockMoves");
const reports = require("./routes/reports");
const thresholds = require("./routes/thresholds");
const app = express();

// 🔧 ADD THIS LINE: convert all BigInt values to string in JSON responses
app.set("json replacer", (_key, value) => (typeof value === "bigint" ? value.toString() : value));

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, svc: "inventory" }));

app.use("/items", items);
app.use("/locations", locations);
app.use("/batches", batches);
app.use("/stock-moves", moves);
app.use("/reports", reports);
app.use("/thresholds", thresholds);
// Global error guard
app.use((err, _req, res, _next) => {
  console.error("[unhandled-error]", err);
  res.status(500).json({ error: "Internal error" });
});

const port = Number(process.env.PORT || 4001);
app.listen(port, () => console.log(`inventory-svc on http://localhost:${port}`));
