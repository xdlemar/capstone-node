const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
dotenv.config();

const auth = require("./routes/auth");
const adminUsers = require("./routes/adminUsers");
const dashboard = require("./routes/dashboard");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, svc: "auth" }));
app.use("/admin", adminUsers);
app.use("/dashboard", dashboard);
app.use("/", auth);

app.listen(Number(process.env.PORT || 4000), () =>
  console.log(`auth-svc on http://localhost:${process.env.PORT || 4000}`)
);
