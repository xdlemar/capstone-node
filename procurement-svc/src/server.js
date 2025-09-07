const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();
const app = express();
app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
// ✅ Public health
app.get("/health", (_req, res) => res.json({ ok: true, svc: "procurement" }));


// ✅ Mount routes at ROOT to match gateway pathRewrite
const pr = require("./routes/pr");             // expects /pr, /pr/:no/approve
const po = require("./routes/po");             // expects /po
const rcv = require("./routes/receipts");      // expects /receipts
const att = require("./routes/attachments");   // expects /attachments
const ven = require("./routes/vendors");       // expects /vendors

app.use(pr);
app.use(po);
app.use(rcv);
app.use(att);
app.use(ven);

const port = Number(process.env.PORT || 4002);
app.listen(port, () => console.log(`procurement-svc on http://localhost:${port}`));
