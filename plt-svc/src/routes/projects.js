const router = require('express').Router();
const { prisma } = require('../prisma');  // ← same pattern as inventory/procurement

// Create project
router.post('/', async (req, res, next) => {
  try {
    const { code, name, managerId, startsOn, endsOn, description } = req.body;
    const p = await prisma.project.create({
      data: {
        code,
        name,
        managerId: managerId ? BigInt(managerId) : null,
        startsOn: startsOn ? new Date(startsOn) : null,
        endsOn: endsOn ? new Date(endsOn) : null,
        description
      }
    });
    res.json(p);
  } catch (e) { next(e); }
});

// Upsert planned material for a project
router.post('/:id/materials', async (req, res, next) => {
  try {
    const projectId = BigInt(req.params.id);
    const { itemId, qtyPlanned, unit, notes } = req.body;
    const row = await prisma.projectMaterialAlloc.upsert({
      where: { projectId_itemId: { projectId, itemId: BigInt(itemId) } },
      update: { qtyPlanned, unit, notes },
      create: { projectId, itemId: BigInt(itemId), qtyPlanned, unit, notes }
    });
    res.json(row);
  } catch (e) { next(e); }
});

// Project summary
router.get('/:id/summary', async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const [project, deliveries, materials, costs] = await Promise.all([
      prisma.project.findUnique({ where: { id } }),
      prisma.delivery.findMany({ where: { projectId: id } }),
      prisma.projectMaterialAlloc.findMany({ where: { projectId: id } }),
      prisma.projectCost.findMany({ where: { projectId: id } })
    ]);
    res.json({ project, deliveries, materials, costs });
  } catch (e) { next(e); }
});

module.exports = router;
