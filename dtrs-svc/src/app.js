const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

app.get("/health", (_req, res) => res.json({ ok: true, svc: "dtrs" }));
app.use("/documents", require("./routes/documents"));

module.exports = app;
