const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const app = express();
// 1) Infra middlewares (do NOT add express.json here)
app.use(cors());
app.use(morgan("dev"));
function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
// optional: common proxy error handler so requests don't "hang" forever
function onProxyError(err, req, res) {
  console.error("[proxy-error]", err?.code || err?.message || err);
  if (!res.headersSent) {
    res.status(502).json({ error: "Upstream unavailable" });
  }
}
function proxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
    // fail fast instead of hanging
    proxyTimeout: 15_000,
    timeout: 15_000,
    logLevel: "warn",
    pathRewrite: (path) =>
      path.replace(/^\/api\/(auth|inventory|procurement|alms|dtrs|plt)/, ""),
    onError: onProxyError,
    onProxyReq: (proxyReq, req) => {
      // propagate user context
      const u = req.user || {};
      proxyReq.setHeader("x-user-id", u.sub || "");
      proxyReq.setHeader(
        "x-user-roles",
        Array.isArray(u.roles) ? u.roles.join(",") : ""
      );
    },
  });
}

app.use("/api/auth", proxy(process.env.AUTH_URL)); // public
app.use("/api/inventory", authRequired, proxy(process.env.INVENTORY_URL));
app.use("/api/procurement", authRequired, proxy(process.env.PROCUREMENT_URL));
app.use("/api/alms", authRequired, proxy(process.env.ALMS_URL));
app.use("/api/dtrs", authRequired, proxy(process.env.DTRS_URL));
app.use("/api/plt", authRequired, proxy(process.env.PLT_URL));
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ ok: true, svc: "gateway" }));
const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`gateway on http://localhost:${port}`));
