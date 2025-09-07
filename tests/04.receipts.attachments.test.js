const { authed } = require("./request");

function rand(tag){ return `${tag}-${Math.floor(1000+Math.random()*9000)}`; }

describe("Receipts & attachments", () => {
  const ctx = { PO: null, DR: null };

  beforeAll(async () => {
    // fresh PO
    const PR = rand("PR");
    await authed().post("/api/procurement/pr").send({
      prNo: PR, notes: "auto", lines: [{ itemId: 1, qty: 500, unit: "pack" }]
    });
    await authed().post(`/api/procurement/pr/${PR}/approve`).send();
    ctx.PO = rand("PO");
    await authed().post("/api/procurement/po").send({ poNo: ctx.PO, prNo: PR });
  });

  it("receipt 500 into location 1", async () => {
    ctx.DR = rand("DR");
    const res = await authed().post("/api/procurement/receipts").send({
      poNo: ctx.PO, drNo: ctx.DR, invoiceNo: `INV-${ctx.DR}`,
      lines: [{ itemId: 1, toLocId: 1, qty: 500 }]
    });
    expect(res.status).toBe(201);
    expect(res.body.receipt || res.body).toBeTruthy();
  });

  it("reject duplicate DR for same PO (409)", async () => {
    const dup = await authed().post("/api/procurement/receipts").send({
      poNo: ctx.PO, drNo: ctx.DR, invoiceNo: `INV-${ctx.DR}`
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/Duplicate DR/i);
  });

  it("attachments: add and list (BigInt safe)", async () => {
    const res = await authed().post("/api/procurement/attachments").send({
      targetType: "PO", targetNo: ctx.PO, kind: "DR",
      fileName: `${ctx.DR}.pdf`,
      storageKey: `receipts/${ctx.PO}/${ctx.DR}.pdf`,
      mimeType: "application/pdf", size: 204800
    });
    expect([200,201]).toContain(res.status);

    const list = await authed().get(`/api/procurement/attachments?poNo=${ctx.PO}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body) || Array.isArray(list.body?.data)).toBe(true);
  });
});
