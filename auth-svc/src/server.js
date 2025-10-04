const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
dotenv.config();

const auth = require("./routes/auth");
const adminUsers = require("./routes/adminUsers");
const dashboard = require("./routes/dashboard");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());
app.use(morgan("dev"));

const windowMs = Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.AUTH_RATE_MAX || 25);
const authLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

app.get("/health", (_req, res) => res.json({ ok: true, svc: "auth" }));
app.use("/admin", adminUsers);
app.use("/dashboard", dashboard);
app.use(["/login", "/register"], authLimiter);
app.use("/", auth);

const port = Number(process.env.PORT || 4000);

if (require.main === module) {
  app.listen(port, () =>
    console.log(`auth-svc on http://localhost:${port}`)
  );
}

module.exports = app;
