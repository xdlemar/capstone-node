const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

const router = express.Router();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error("[auth dashboard] invalid token", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

router.use(requireAuth);

router.get("/summary", async (_req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [totalUsers, activeUsers, adminUsers, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.userRole.count({
        where: {
          role: { name: "ADMIN" },
          user: { isActive: true },
        },
      }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    res.json({ totalUsers, activeUsers, adminUsers, newThisWeek: recentUsers });
  } catch (err) {
    console.error("[auth dashboard summary]", err);
    res.status(500).json({ error: "Failed to load user summary" });
  }
});

module.exports = router;
