const router = require("express").Router();
const { prisma } = require("../prisma");
const { requireRole } = require("../auth");

const managerAccess = requireRole("MANAGER", "ADMIN");

function coerceNumber(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

router.get("/", async (req, res, next) => {
  try {
    const { status, q, take = 50 } = req.query;

    const where = {};
    if (status) {
      where.status = String(status).toUpperCase();
    }

    const term = typeof q === "string" ? q.trim() : "";
    if (term) {
      where.OR = [
        { code: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
      ];
    }

    const limit = Math.min(Math.max(Number(take) || 0, 1), 200);

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        _count: { select: { deliveries: true, materials: true } },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            trackingNo: true,
            eta: true,
            createdAt: true,
          },
        },
      },
    });

    res.json(
      projects.map((project) => ({
        id: project.id.toString(),
        code: project.code,
        name: project.name,
        status: project.status,
        managerId: project.managerId ? project.managerId.toString() : null,
        budget: coerceNumber(project.budget),
        startsOn: project.startsOn,
        endsOn: project.endsOn,
        deliveriesCount: project._count?.deliveries ?? 0,
        materialsCount: project._count?.materials ?? 0,
        lastDelivery: project.deliveries[0]
          ? {
              id: project.deliveries[0].id.toString(),
              status: project.deliveries[0].status,
              trackingNo: project.deliveries[0].trackingNo,
              eta: project.deliveries[0].eta,
              createdAt: project.deliveries[0].createdAt,
            }
          : null,
        updatedAt: project.updatedAt,
        createdAt: project.createdAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

// Create project
router.post("/", managerAccess, async (req, res, next) => {
  try {
    const { code, name, managerId, startsOn, endsOn, description, status, budget } = req.body || {};
    const project = await prisma.project.create({
      data: {
        code,
        name,
        status: status ? String(status).toUpperCase() : undefined,
        managerId: managerId ? BigInt(managerId) : null,
        startsOn: startsOn ? new Date(startsOn) : null,
        endsOn: endsOn ? new Date(endsOn) : null,
        description: description || null,
        budget: budget != null ? budget : undefined,
      },
    });
    res.json(project);
  } catch (e) {
    next(e);
  }
});

// Upsert planned material for a project
router.post("/:id/materials", managerAccess, async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const { itemId, qtyPlanned, unit, notes } = req.body;
    const row = await prisma.projectMaterialAlloc.upsert({
      where: { projectId_itemId: { projectId, itemId: BigInt(itemId) } },
      update: { qtyPlanned, unit, notes },
      create: { projectId, itemId: BigInt(itemId), qtyPlanned, unit, notes },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// Project summary
router.get("/:id/summary", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const [project, deliveries, materials, costs] = await Promise.all([
      prisma.project.findUnique({ where: { id } }),
      prisma.delivery.findMany({ where: { projectId: id } }),
      prisma.projectMaterialAlloc.findMany({ where: { projectId: id } }),
      prisma.projectCost.findMany({ where: { projectId: id } }),
    ]);
    res.json({ project, deliveries, materials, costs });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
