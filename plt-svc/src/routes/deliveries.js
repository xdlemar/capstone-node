const router = require('express').Router();
const { prisma } = require('../prisma');  // ← same pattern

const ALLOWED = {
  DRAFT: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'DELAYED', 'CANCELLED'],
  IN_TRANSIT: ['DELAYED', 'DELIVERED', 'CANCELLED'],
  DELAYED: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

// Create delivery
router.post('/', async (req, res, next) => {
  try {
    const { projectId, poId, vendorId, eta, trackingNo, notes } = req.body;
    const d = await prisma.delivery.create({
      data: {
        projectId: BigInt(projectId),
        poId: poId ? BigInt(poId) : null,
        vendorId: vendorId ? BigInt(vendorId) : null,
        eta: eta ? new Date(eta) : null,
        trackingNo,
        notes
      }
    });
    res.json(d);
  } catch (e) { next(e); }
});

// Update status + append DeliveryUpdate
router.patch('/:id/status', async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { status, message, place, occurredAt } = req.body;

    const cur = await prisma.delivery.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ error: 'Not found' });
    if (!ALLOWED[cur.status].includes(status)) {
      return res.status(400).json({ error: `Illegal ${cur.status} -> ${status}` });
    }

    const out = await prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({
        where: { id },
        data: { status, arrivedAt: status === 'DELIVERED' ? new Date() : cur.arrivedAt }
      });
      await tx.deliveryUpdate.create({
        data: {
          deliveryId: id,
          status,
          message,
          place,
          occurredAt: occurredAt ? new Date(occurredAt) : undefined
        }
      });
      return d;
    });

    res.json(out);
  } catch (e) { next(e); }
});
// List deliveries with filters (+ simple pagination)
router.get('/', async (req, res, next) => {
  try {
    const { projectId, poId, status, skip = 0, take = 50 } = req.query;
    const where = {
      projectId: projectId ? BigInt(projectId) : undefined,
      poId:      poId      ? BigInt(poId)      : undefined,
      status:    status || undefined,
    };
    const rows = await prisma.delivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Math.min(Number(take), 200)
    });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
