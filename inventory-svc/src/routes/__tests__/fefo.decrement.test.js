const express = require("express");
const request = require("supertest");

function createEmptyStore() {
  return {
    batches: [],
    issues: [],
    issueLines: [],
    issueAllocs: [],
    transfers: [],
    transferLines: [],
    stockMoves: [],
    counters: {
      batch: 1n,
      issue: 1n,
      issueLine: 1n,
      issueAlloc: 1n,
      transfer: 1n,
      transferLine: 1n,
      stockMove: 1n,
    },
  };
}

function toBigInt(value) {
  return value == null ? null : (typeof value === "bigint" ? value : BigInt(value));
}

function cloneBatch(batch) {
  return {
    id: batch.id,
    itemId: batch.itemId,
    lotNo: batch.lotNo,
    expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
    qtyOnHand: Number(batch.qtyOnHand ?? 0),
  };
}

function cloneIssue(issue) {
  return {
    id: issue.id,
    issueNo: issue.issueNo,
    fromLocId: issue.fromLocId,
    toLocId: issue.toLocId,
    notes: issue.notes,
    createdAt: issue.createdAt ? new Date(issue.createdAt) : null,
  };
}

function cloneIssueLine(line) {
  return {
    id: line.id,
    issueId: line.issueId,
    itemId: line.itemId,
    qtyReq: Number(line.qtyReq),
    qtyIssued: Number(line.qtyIssued ?? 0),
    notes: line.notes,
  };
}

function cloneIssueAlloc(alloc) {
  return {
    id: alloc.id,
    issueLineId: alloc.issueLineId,
    batchId: alloc.batchId,
    qty: Number(alloc.qty ?? 0),
  };
}

function cloneTransfer(xfer) {
  return {
    id: xfer.id,
    transferNo: xfer.transferNo,
    fromLocId: xfer.fromLocId,
    toLocId: xfer.toLocId,
    notes: xfer.notes,
    createdAt: xfer.createdAt ? new Date(xfer.createdAt) : null,
  };
}

function cloneTransferLine(line) {
  return {
    id: line.id,
    transferId: line.transferId,
    itemId: line.itemId,
    qty: Number(line.qty ?? 0),
    notes: line.notes,
  };
}

function cloneStockMove(move) {
  return {
    id: move.id,
    itemId: move.itemId,
    batchId: move.batchId,
    fromLocId: move.fromLocId,
    toLocId: move.toLocId,
    qty: Number(move.qty ?? 0),
    reason: move.reason,
    refType: move.refType,
    refId: move.refId,
    eventId: move.eventId,
    occurredAt: move.occurredAt ? new Date(move.occurredAt) : null,
    createdAt: move.createdAt ? new Date(move.createdAt) : null,
  };
}

function assignArray(target, source) {
  target.length = 0;
  for (const item of source) target.push(item);
}

function cloneStore(store) {
  return {
    batches: store.batches.map(cloneBatch),
    issues: store.issues.map(cloneIssue),
    issueLines: store.issueLines.map(cloneIssueLine),
    issueAllocs: store.issueAllocs.map(cloneIssueAlloc),
    transfers: store.transfers.map(cloneTransfer),
    transferLines: store.transferLines.map(cloneTransferLine),
    stockMoves: store.stockMoves.map(cloneStockMove),
    counters: { ...store.counters },
  };
}

function restoreStore(target, snapshot) {
  assignArray(target.batches, snapshot.batches.map(cloneBatch));
  assignArray(target.issues, snapshot.issues.map(cloneIssue));
  assignArray(target.issueLines, snapshot.issueLines.map(cloneIssueLine));
  assignArray(target.issueAllocs, snapshot.issueAllocs.map(cloneIssueAlloc));
  assignArray(target.transfers, snapshot.transfers.map(cloneTransfer));
  assignArray(target.transferLines, snapshot.transferLines.map(cloneTransferLine));
  assignArray(target.stockMoves, snapshot.stockMoves.map(cloneStockMove));
  for (const key of Object.keys(target.counters)) {
    target.counters[key] = snapshot.counters[key];
  }
}

function resetStore(store) {
  store.batches.length = 0;
  store.issues.length = 0;
  store.issueLines.length = 0;
  store.issueAllocs.length = 0;
  store.transfers.length = 0;
  store.transferLines.length = 0;
  store.stockMoves.length = 0;
  store.counters.batch = 1n;
  store.counters.issue = 1n;
  store.counters.issueLine = 1n;
  store.counters.issueAlloc = 1n;
  store.counters.transfer = 1n;
  store.counters.transferLine = 1n;
  store.counters.stockMove = 1n;
}

function selectFields(record, select) {
  if (!select) return { ...record };
  const picked = {};
  for (const key of Object.keys(select)) {
    if (select[key]) picked[key] = record[key];
  }
  return picked;
}

function sortBatches(rows, orderBy = []) {
  if (!orderBy || !orderBy.length) return rows;
  const orderers = Array.isArray(orderBy) ? orderBy : [orderBy];
  return rows.slice().sort((a, b) => {
    for (const clause of orderers) {
      if (clause.expiryDate) {
        const dir = clause.expiryDate === "desc" ? -1 : 1;
        const aVal = a.expiryDate ? a.expiryDate.getTime() : Number.MAX_SAFE_INTEGER;
        const bVal = b.expiryDate ? b.expiryDate.getTime() : Number.MAX_SAFE_INTEGER;
        if (aVal !== bVal) return (aVal - bVal) * dir;
      } else if (clause.id) {
        const dir = clause.id === "desc" ? -1 : 1;
        if (a.id !== b.id) return (a.id < b.id ? -1 : 1) * dir;
      }
    }
    return 0;
  });
}

function createPrismaMock(store) {
  class FakePrismaClient {
    constructor() {
      const client = this;
      client._store = store;

      client.batch = {
        findMany: async ({ where = {}, orderBy = [], select } = {}) => {
          let rows = client._store.batches.filter((b) => {
            if (where.itemId != null && b.itemId !== toBigInt(where.itemId)) return false;
            return true;
          });
          rows = sortBatches(rows, orderBy);
          return rows.map((row) => selectFields(cloneBatch(row), select));
        },
        findFirst: async ({ where = {}, orderBy = [] } = {}) => {
          const rows = await client.batch.findMany({ where, orderBy });
          return rows[0] || null;
        },
        create: async ({ data }) => {
          const id = client._nextId("batch");
          const batch = {
            id,
            itemId: toBigInt(data.itemId),
            lotNo: data.lotNo ?? null,
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
            qtyOnHand: Number(data.qtyOnHand ?? 0),
          };
          client._store.batches.push(batch);
          return cloneBatch(batch);
        },
        update: async ({ where, data }) => {
          const id = toBigInt(where.id);
          const batch = client._store.batches.find((b) => b.id === id);
          if (!batch) throw new Error(`Batch ${id} not found`);
          if (data.qtyOnHand?.increment != null) {
            batch.qtyOnHand = Number(batch.qtyOnHand) + Number(data.qtyOnHand.increment);
          }
          if (data.qtyOnHand?.decrement != null) {
            const next = Number(batch.qtyOnHand) - Number(data.qtyOnHand.decrement);
            batch.qtyOnHand = next < 0 ? 0 : next;
          }
          return cloneBatch(batch);
        },
      };

      client.stockMove = {
        create: async ({ data }) => {
          const id = client._nextId("stockMove");
          const move = {
            id,
            itemId: toBigInt(data.itemId),
            batchId: data.batchId != null ? toBigInt(data.batchId) : null,
            fromLocId: data.fromLocId != null ? toBigInt(data.fromLocId) : null,
            toLocId: data.toLocId != null ? toBigInt(data.toLocId) : null,
            qty: Number(data.qty ?? 0),
            reason: data.reason,
            refType: data.refType ?? null,
            refId: data.refId != null ? toBigInt(data.refId) : null,
            eventId: data.eventId ?? null,
            occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
            createdAt: new Date(),
          };
          client._store.stockMoves.push(move);
          return cloneStockMove(move);
        },
      };

      client.issue = {
        create: async ({ data, include }) => {
          const id = client._nextId("issue");
          const issue = {
            id,
            issueNo: data.issueNo,
            fromLocId: data.fromLocId,
            toLocId: data.toLocId,
            notes: data.notes ?? null,
            createdAt: new Date(),
          };
          client._store.issues.push(issue);

          const createdLines = [];
          for (const line of data.lines?.create || []) {
            createdLines.push(client._createIssueLine(id, line));
          }

          if (include?.lines) {
            return {
              ...cloneIssue(issue),
              lines: createdLines.map((ln) => cloneIssueLine(ln)),
            };
          }

          return cloneIssue(issue);
        },
        findUnique: async ({ where, include }) => {
          const id = toBigInt(where.id);
          const issue = client._store.issues.find((i) => i.id === id);
          if (!issue) return null;
          const result = cloneIssue(issue);
          if (include?.lines) {
            result.lines = client._store.issueLines
              .filter((ln) => ln.issueId === id)
              .map((ln) => cloneIssueLine(ln));
          }
          return result;
        },
      };

      client.issueLine = {
        update: async ({ where, data }) => {
          const id = toBigInt(where.id);
          const line = client._store.issueLines.find((ln) => ln.id === id);
          if (!line) throw new Error(`IssueLine ${id} not found`);
          if (data.qtyIssued != null) line.qtyIssued = Number(data.qtyIssued);
          if (data.notes !== undefined) line.notes = data.notes;
          return cloneIssueLine(line);
        },
      };

      client.issueAlloc = {
        create: async ({ data }) => {
          const id = client._nextId("issueAlloc");
          const alloc = {
            id,
            issueLineId: toBigInt(data.issueLineId),
            batchId: toBigInt(data.batchId),
            qty: Number(data.qty ?? 0),
          };
          client._store.issueAllocs.push(alloc);
          return cloneIssueAlloc(alloc);
        },
      };

      client.transfer = {
        create: async ({ data, include }) => {
          const id = client._nextId("transfer");
          const transfer = {
            id,
            transferNo: data.transferNo,
            fromLocId: data.fromLocId,
            toLocId: data.toLocId,
            notes: data.notes ?? null,
            createdAt: new Date(),
          };
          client._store.transfers.push(transfer);

          const createdLines = [];
          for (const line of data.lines?.create || []) {
            createdLines.push(client._createTransferLine(id, line));
          }

          if (include?.lines) {
            return {
              ...cloneTransfer(transfer),
              lines: createdLines.map((ln) => cloneTransferLine(ln)),
            };
          }

          return cloneTransfer(transfer);
        },
      };
    }

    _nextId(key) {
      const current = this._store.counters[key];
      this._store.counters[key] = current + 1n;
      return current;
    }

    _createIssueLine(issueId, line) {
      const id = this._nextId("issueLine");
      const record = {
        id,
        issueId,
        itemId: toBigInt(line.itemId),
        qtyReq: Number(line.qtyReq ?? 0),
        qtyIssued: Number(line.qtyIssued ?? 0),
        notes: line.notes ?? null,
      };
      this._store.issueLines.push(record);
      return record;
    }

    _createTransferLine(transferId, line) {
      const id = this._nextId("transferLine");
      const record = {
        id,
        transferId,
        itemId: toBigInt(line.itemId),
        qty: Number(line.qty ?? 0),
        notes: line.notes ?? null,
      };
      this._store.transferLines.push(record);
      return record;
    }

    async $transaction(fn) {
      const snapshot = cloneStore(this._store);
      try {
        const result = await fn(this);
        return result;
      } catch (err) {
        restoreStore(this._store, snapshot);
        throw err;
      }
    }

    async $disconnect() {
      // no-op for tests
    }

    static __reset() {
      resetStore(store);
    }
  }

  return { PrismaClient: FakePrismaClient };
}

describe("FEFO allocations decrement qtyOnHand", () => {
  let agent;
  let PrismaClient;

  beforeEach(() => {
    jest.resetModules();
    const store = createEmptyStore();
    jest.doMock("@prisma/client", () => createPrismaMock(store));
    ({ PrismaClient } = require("@prisma/client"));
    PrismaClient.__reset();

    const issues = require("../../routes/issues");
    const transfers = require("../../routes/transfers");
    const moves = require("../../routes/stockMoves");

    const app = express();
    app.use(express.json());
    app.set("json replacer", (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    app.use("/issues", issues);
    app.use("/transfers", transfers);
    app.use("/stock-moves", moves);

    agent = request(app);
  });

  afterEach(() => {
    jest.resetModules();
  });

  test("issues eventually exhaust FEFO batches", async () => {
    PrismaClient.__reset();

    await agent
      .post("/stock-moves")
      .send({
        itemId: 1,
        qty: 5,
        reason: "RECEIPT",
        toLocId: 1,
        lotNo: "LOT-1",
        expiryDate: "2026-01-01T00:00:00.000Z",
      })
      .expect(201);

    const first = await agent
      .post("/issues")
      .send({
        issueNo: "ISS-1",
        fromLocId: 1,
        toLocId: 2,
        lines: [{ itemId: 1, qty: 3 }],
      })
      .expect(201);

    expect(first.body.lines?.[0]?.qtyIssued).toBe(3);

    const second = await agent
      .post("/issues")
      .send({
        issueNo: "ISS-2",
        fromLocId: 1,
        toLocId: 2,
        lines: [{ itemId: 1, qty: 3 }],
      })
      .expect(409);

    expect(second.body).toMatchObject({ error: "Insufficient stock (FEFO)" });
  });

  test("transfers eventually exhaust FEFO batches", async () => {
    PrismaClient.__reset();

    await agent
      .post("/stock-moves")
      .send({
        itemId: 2,
        qty: 4,
        reason: "RECEIPT",
        toLocId: 1,
        lotNo: "LOT-X",
        expiryDate: "2026-06-01T00:00:00.000Z",
      })
      .expect(201);

    const ok = await agent
      .post("/transfers")
      .send({
        transferNo: "XFER-1",
        fromLocId: 1,
        toLocId: 3,
        lines: [{ itemId: 2, qty: 3 }],
      })
      .expect(201);

    expect(ok.body.lines?.[0]?.qty).toBe(3);

    const fail = await agent
      .post("/transfers")
      .send({
        transferNo: "XFER-2",
        fromLocId: 1,
        toLocId: 4,
        lines: [{ itemId: 2, qty: 3 }],
      })
      .expect(409);

    expect(fail.body).toMatchObject({ error: "Insufficient stock (FEFO)" });
  });
});
