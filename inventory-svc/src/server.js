const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

// routes...
const items = require("./routes/items");
const locations = require("./routes/locations");
const batches = require("./routes/batches");
const moves = require("./routes/stockMoves");
const reports = require("./routes/reports");
const thresholds = require("./routes/thresholds");
const issues = require("./routes/issues");
const transfers = require("./routes/transfers");
const counts = require("./routes/counts");
const inspection = require("./routes/inspection");
const notifications = require("./routes/notifications");
const { authRequired } = require("./auth");

const app = express();

// Single JSON parser, before routes
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Serialize bigint to string in JSON
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

// health
app.get("/health", (_req, res) => res.json({ ok: true, svc: "inventory" }));

app.use(authRequired);

// mount routes at ROOT
app.use("/stock-moves", moves);
app.use("/issues", issues);
app.use("/transfers", transfers);
app.use("/counts", counts);
app.use("/inspection", inspection);
app.use("/notifications", notifications);
app.use("/items", items);
app.use("/locations", locations);
app.use("/batches", batches);
app.use("/reports", reports);
app.use("/thresholds", thresholds);

const port = Number(process.env.PORT || 4001);
app.listen(port, () => console.log(`inventory-svc on http://localhost:${port}`));
