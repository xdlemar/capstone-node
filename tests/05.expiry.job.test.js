const { authed } = require("./request");

function rand(tag){ return `${tag}-${Math.floor(1000+Math.random()*9000)}`; }

describe("Expiry notifications", () => {
  const ctx = { PO: null, DR: null };

  beforeAll(async () => {
    const PR = rand("PR");
    await authed().post("/api/procurement/pr").send({
      prNo: PR, notes: "expiry", lines: [{ itemId: 1, qty: 3, unit: "pack" }]
    });
    await authed().post(`/api/procurement/pr/${PR}/approve`).send();
    ctx.PO = rand("PO");
    await authed().post("/api/procurement/po").send({ poNo: ctx.PO, prNo: PR });
  });

  it("receipt with soon-to-expire lot", async () => {
    ctx.DR = rand("DR");
    const in10 = new Date(Date.now()+10*86400000).toISOString().slice(0,10);
    const res = await authed().post("/api/procurement/receipts").send({
      poNo: ctx.PO, drNo: ctx.DR, invoiceNo: `INV-${ctx.DR}`,
      lines: [{ itemId: 1, toLocId: 1, qty: 3, lotNo: `LOT-${ctx.DR}`, expiryDate: in10 }]
    });
    expect(res.status).toBe(201);
  });

  it("run expiry job (via HTTP hook if exposed) or expect notification exists", async () => {
    // If you expose a GET /api/inventory/notifications?unresolved=true we just read it
    const notes = await authed().get("/api/inventory/notifications?unresolved=true");
    expect(notes.status).toBe(200);
    // At least one EXPIRY message should be present
    const arr = Array.isArray(notes.body) ? notes.body : notes.body?.data || [];
    const hit = arr.find(n => /EXPIRY/.test(n.message || ""));
    expect(hit).toBeTruthy();

    // Resolve the first one
    if (hit) {
      const done = await authed().post(`/api/inventory/notifications/${hit.id}/resolve`).send();
      expect(done.status).toBe(200);
      expect(done.body.resolvedAt).toBeTruthy();
    }
  });
});
