const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { authRequired, requireRole } = require("../auth");

const managerAccess = requireRole("MANAGER", "ADMIN");

router.use(authRequired);
router.use(managerAccess);

router.get("/summary", async (_req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [totalDocuments, recentUploads, awaitingSignatures, recentDocs] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.docSignature.count({ where: { storageKey: null } }),
      prisma.document.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          module: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      totalDocuments,
      recentUploads,
      awaitingSignatures,
      recentDocs: recentDocs.map((doc) => ({
        id: doc.id.toString(),
        title: doc.title,
        module: doc.module,
        createdAt: doc.createdAt,
      })),
    });
  } catch (err) {
    console.error("[dtrs dashboard]", err);
    res.status(500).json({ error: "Failed to load document summary" });
  }
});

module.exports = router;
