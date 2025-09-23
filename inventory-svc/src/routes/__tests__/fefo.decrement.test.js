const express = require("express");
const request = require("supertest");

const mockPrisma = {
  issue: { create: jest.fn(), findUnique: jest.fn() },
  batch: { findMany: jest.fn() },
  stockMove: { create: jest.fn() },
  issueLine: { update: jest.fn() },
  issueAlloc: { create: jest.fn() },
  $transaction: jest.fn(),
};

const issueCreate = mockPrisma.issue.create;
const issueFindUnique = mockPrisma.issue.findUnique;
const batchFindMany = mockPrisma.batch.findMany;
const stockMoveCreate = mockPrisma.stockMove.create;
const issueLineUpdate = mockPrisma.issueLine.update;
const issueAllocCreate = mockPrisma.issueAlloc.create;
const transactionMock = mockPrisma.$transaction;

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const issuesRouter = require("../issues");

const app = express();
app.use(express.json());
app.use("/issues", issuesRouter);

const buildIssue = (qtyReq = 5) => ({
  id: BigInt(101),
  issueNo: "ISS-UNIT-1",
  fromLocId: BigInt(1),
  toLocId: BigInt(2),
  notes: null,
  lines: [
    {
      id: BigInt(201),
      issueId: BigInt(101),
      itemId: BigInt(1),
      qtyReq,
      qtyIssued: 0,
      notes: null,
    },
  ],
});

describe("POST /issues FEFO decrement", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    transactionMock.mockImplementation(async (cb) => cb(mockPrisma));
  });

  test("falls back to no-batch move when no FEFO batches exist", async () => {
    const issue = buildIssue(5);
    issueCreate.mockResolvedValueOnce(issue);
    batchFindMany.mockResolvedValueOnce([]);
    stockMoveCreate.mockResolvedValue();
    issueLineUpdate.mockResolvedValue();

    issueFindUnique.mockResolvedValueOnce({
      ...issue,
      lines: issue.lines.map((ln) => ({
        ...ln,
        qtyIssued: ln.qtyReq,
      })),
    });

    const res = await request(app)
      .post("/issues")
      .send({
        issueNo: issue.issueNo,
        fromLocId: Number(issue.fromLocId),
        toLocId: Number(issue.toLocId),
        lines: [{ itemId: Number(issue.lines[0].itemId), qty: issue.lines[0].qtyReq }],
      });

    expect(res.status).toBe(201);
    expect(issueAllocCreate).not.toHaveBeenCalled();
    expect(stockMoveCreate).toHaveBeenCalledTimes(1);
    expect(stockMoveCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qty: issue.lines[0].qtyReq,
          eventId: expect.stringContaining("nobatch"),
        }),
      })
    );
    expect(issueLineUpdate).toHaveBeenCalledWith({
      where: { id: issue.lines[0].id },
      data: { qtyIssued: issue.lines[0].qtyReq },
    });
    expect(res.body.lines[0]).toMatchObject({ qtyIssued: issue.lines[0].qtyReq });
  });

  test("returns 409 when FEFO batches are insufficient", async () => {
    const issue = buildIssue(5);
    issueCreate.mockResolvedValueOnce(issue);
    batchFindMany.mockResolvedValueOnce([
      { id: BigInt(301), qtyOnHand: 2 },
    ]);
    issueAllocCreate.mockResolvedValue();
    stockMoveCreate.mockResolvedValue();

    const res = await request(app)
      .post("/issues")
      .send({
        issueNo: issue.issueNo,
        fromLocId: Number(issue.fromLocId),
        toLocId: Number(issue.toLocId),
        lines: [{ itemId: Number(issue.lines[0].itemId), qty: issue.lines[0].qtyReq }],
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Insufficient stock (FEFO)" });
    expect(issueAllocCreate).toHaveBeenCalledTimes(1);
    expect(stockMoveCreate).toHaveBeenCalledTimes(1);
    expect(issueLineUpdate).not.toHaveBeenCalled();
    expect(issueFindUnique).not.toHaveBeenCalled();
  });
});
