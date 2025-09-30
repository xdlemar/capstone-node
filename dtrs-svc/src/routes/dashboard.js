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

    const [totalDocuments, recentUploads, awaitingSignatures, recentDocs, incompleteDocuments] = await Promise.all([
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
      prisma.document.findMany({
        where: {
          OR: [
            { signatures: { some: { storageKey: null } } },
            { versions: { some: { storageKey: { startsWith: "placeholder:" } } } },
          ],
        },
        select: {
          id: true,
          title: true,
          module: true,
          createdAt: true,
          signatures: {
            where: { storageKey: null },
            select: { id: true, method: true, signedAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
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
      incompleteDocuments: incompleteDocuments.map((doc) => ({
        id: doc.id.toString(),
        title: doc.title,
        module: doc.module,
        createdAt: doc.createdAt,
        pendingSignatures: doc.signatures.map((sig) => ({
          id: sig.id.toString(),
          method: sig.method,
          signedAt: sig.signedAt,
        })),
      })),
    });
  } catch (err) {
    console.error("[dtrs dashboard]", err);
    res.status(500).json({ error: "Failed to load document summary" });
  }
});

module.exports = router;
