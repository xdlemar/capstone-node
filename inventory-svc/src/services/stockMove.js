const { prisma } = require("../prisma");
const { Prisma } = require("@prisma/client");

async function recordStockMove({
  itemId,
  qty,
  reason,
  refType = null,
  refId = null,
  eventId = null,
  fromLocId = null,
  toLocId = null,
  lotNo = null,
  expiryDate = null,
  batchId = null,
}) {
  const qtyNumber = typeof qty === "number" ? qty : Number(qty);
  if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
    const err = new Error("qty must be a positive number");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  const qtyStr = typeof qty === "string" ? qty : qtyNumber.toString();

  const itemIdBig = BigInt(itemId);
  const fromLocIdBig = fromLocId != null ? BigInt(fromLocId) : null;
  const toLocIdBig = toLocId != null ? BigInt(toLocId) : null;
  const batchIdBig = batchId != null ? BigInt(batchId) : null;
  const refIdBig = refId != null ? BigInt(refId) : null;
  const expiryDt = expiryDate ? new Date(expiryDate) : null;
  const lotValue = lotNo === "" ? null : lotNo;

  const dataMove = {
    itemId: itemIdBig,
    qty: qtyStr,
    reason: String(reason),
    refType,
    refId: refIdBig,
    eventId: eventId || null,
    fromLocId: fromLocIdBig,
    toLocId: toLocIdBig,
    batchId: null,
    occurredAt: new Date(),
  };

  return prisma.$transaction(async (p) => {
    let resolvedOutboundBatch = null;
    let inboundBatch = null;

    const hasDestination = Boolean(toLocIdBig);
    const isOutbound = Boolean(fromLocIdBig);

    if (hasDestination) {
      const batchWhere = {
        itemId: itemIdBig,
        lotNo: lotValue,
        expiryDate: expiryDt,
      };

      inboundBatch = await p.batch.findFirst({ where: batchWhere });
      if (!inboundBatch) {
        inboundBatch = await p.batch.create({
          data: {
            itemId: batchWhere.itemId,
            lotNo: batchWhere.lotNo,
            expiryDate: batchWhere.expiryDate,
            qtyOnHand: new Prisma.Decimal(0),
          },
        });
      }

      await p.batch.update({
        where: { id: inboundBatch.id },
        data: { qtyOnHand: { increment: qtyStr } },
      });
    }

    if (isOutbound) {
      if (batchIdBig) {
        resolvedOutboundBatch = await p.batch.findUnique({ where: { id: batchIdBig } });
        if (!resolvedOutboundBatch || resolvedOutboundBatch.itemId !== itemIdBig) {
          const err = new Error("Batch not found for item");
          err.status = 404;
          err.code = "BATCH_NOT_FOUND";
          throw err;
        }
      } else if (lotValue !== null || expiryDt) {
        resolvedOutboundBatch = await p.batch.findFirst({
          where: {
            itemId: itemIdBig,
            lotNo: lotValue,
            expiryDate: expiryDt,
          },
        });
        if (!resolvedOutboundBatch) {
          const err = new Error("Batch not found");
          err.status = 404;
          err.code = "BATCH_NOT_FOUND";
          throw err;
        }
      }

      if (resolvedOutboundBatch) {
        const available = Number(resolvedOutboundBatch.qtyOnHand);
        if (Number.isFinite(available) && available < qtyNumber) {
          const err = new Error("Insufficient batch quantity");
          err.status = 409;
          err.code = "INSUFFICIENT_STOCK";
          throw err;
        }

        await p.batch.update({
          where: { id: resolvedOutboundBatch.id },
          data: { qtyOnHand: { decrement: qtyStr } },
        });
      }
    }

    const batchForMove = inboundBatch ?? resolvedOutboundBatch;
    if (batchForMove) {
      dataMove.batchId = batchForMove.id;
    }

    return p.stockMove.create({ data: dataMove });
  });
}

module.exports = { recordStockMove };


