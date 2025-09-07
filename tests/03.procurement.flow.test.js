const { authed } = require("./request");

function rand(tag){ return `${tag}-${Math.floor(1000+Math.random()*9000)}`; }

describe("Procurement flow", () => {
  const ctx = {};
  it("create PR then approve", async () => {
    ctx.PR = rand("PR");
    const pr = await authed().post("/api/procurement/pr").send({
      prNo: ctx.PR, notes: "ER resupply",
      lines: [{ itemId: 1, qty: 500, unit: "pack", notes: "gauze" }]
    });
    expect(pr.status).toBe(200);
    const appr = await authed().post(`/api/procurement/pr/${ctx.PR}/approve`).send();
    expect(appr.status).toBe(200);
    expect(appr.body.status).toMatch(/APPROVED|SUBMITTED/i);
  });

  it("create PO from PR", async () => {
    ctx.PO = rand("PO");
    const po = await authed().post("/api/procurement/po").send({ poNo: ctx.PO, prNo: ctx.PR });
    expect(po.status).toBe(200);
    expect(po.body.status).toMatch(/OPEN|RECEIVED|PARTIAL/);
  });
});
