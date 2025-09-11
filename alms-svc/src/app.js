const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

app.get("/health", (_req, res) => res.json({ ok: true, svc: "alms" }));

app.use("/assets", require("./routes/assets"));
app.use("/workorders", require("./routes/workorders"));
app.use("/schedules", require("./routes/schedules"));
app.use("/repairs", require("./routes/repairs"));
app.use("/transfers", require("./routes/transfers"));
app.use("/disposals", require("./routes/disposals"));

module.exports = app;
