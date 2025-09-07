const { authed } = require("./request");

function rand(tag){ return `${tag}-${Math.floor(1000+Math.random()*9000)}`; }

describe("Issues & Counts", () => {
  it("create issue 150 from 1 -> 2", async () => {
    const ISS = rand("ISS");
    const res = await authed().post("/api/inventory/issues").send({
      issueNo: ISS, fromLocId: 1, toLocId: 2,
      lines: [{ itemId: 1, qty: 150, notes: "ER replenishment" }]
    });
    expect([200,201]).toContain(res.status);
    expect(res.body.lines?.length || 0).toBeGreaterThan(0);
  });

  it("stock count adjustment -5", async () => {
    const CNT = rand("CNT");
    const create = await authed().post("/api/inventory/counts").send({
      sessionNo: CNT, locationId: 1,
      lines: [{ itemId: 1, countedQty: 980, systemQty: 985, variance: -5, notes: "shrinkage" }]
    });
    expect([200,201]).toContain(create.status);

    const post = await authed().post(`/api/inventory/counts/${CNT}/post`).send();
    expect([200,409]).toContain(post.status);   // 409 if already posted
  });

  it("usage ledger shows ISSUE and COUNT", async () => {
    const ledger = await authed().get("/api/inventory/reports/usage?from=2025-01-01");
    expect(ledger.status).toBe(200);
    const rows = Array.isArray(ledger.body) ? ledger.body : ledger.body?.data || [];
    const hasIssue = rows.some(r => r.reason === "ISSUE" || r.refType === "ISSUE");
    const hasAdj   = rows.some(r => r.reason === "ADJUSTMENT" || r.refType === "COUNT");
    expect(hasIssue).toBe(true);
    expect(hasAdj).toBe(true);
  });
});
