const request = require("supertest");
const jwt = require("jsonwebtoken");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";
const JWT_SECRET  = process.env.JWT_SECRET  || "super_secret_dev";
const ITEM_ID     = Number(process.env.ITEM_ID) || 1; // re-use your seeded item

describe("E2E: Procurement + PLT (shipment tied to PO) via Gateway", () => {
  let agent, authz, token;
  const S = {};

  beforeAll(() => {
    token = jwt.sign(
      { sub: "student1", name: "QA Runner", roles: ["procurement","plt","inventory"] },
      JWT_SECRET
    );
    authz = { Authorization: `Bearer ${token}` };
    agent = request(GATEWAY_URL);
  });

  test("health checks", async () => {
    await agent.get("/api/procurement/health").set(authz).expect(200);
    await agent.get("/api/plt/health").set(authz).expect(200);
  });

  test("upsert vendor", async () => {
    const res = await agent.post("/api/procurement/vendors")
      .set(authz).send({ name: "MedSupply Co.", email: "sales@medsupply.local" }).expect(200);
    S.vendor = res.body;
  });

  test("create PR -> approve -> PO", async () => {
    const prNo = `PR-${Math.floor(Math.random()*1e9)}`;
    const pr = await agent.post("/api/procurement/pr").set(authz).send({
      prNo, notes: "Radiology supplies", lines: [{ itemId: ITEM_ID, qty: 100, unit: "box" }]
    }).expect(200);
    expect(pr.body.status).toBe("SUBMITTED");

    const approved = await agent.post(`/api/procurement/pr/${prNo}/approve`).set(authz).expect(200);
    expect(approved.body.status).toBe("APPROVED");

    const poNo = `PO-${Math.floor(Math.random()*1e9)}`;
    const po = await agent.post("/api/procurement/po").set(authz).send({ poNo, prNo }).expect(200);
    expect(po.body.status).toBe("OPEN");
    S.po = po.body;
  });

  test("PLT: create project, then delivery linked to PO", async () => {
    const proj = await agent.post("/api/plt/projects").set(authz).send({
      code: `PRJ-${Math.floor(Math.random()*1e9)}`, name: "Radiology Upgrade"
    }).expect(200);
    S.project = proj.body;

    const del = await agent.post("/api/plt/deliveries").set(authz).send({
      projectId: S.project.id,
      poId:      S.po.id,
      trackingNo: `TRK-${Math.floor(Math.random()*1e9)}`,
      eta: "2025-10-01T10:00:00Z"
    }).expect(200);
    expect(del.body.status).toBe("DRAFT");
    S.delivery = del.body;
  });

 test("PLT: DISPATCHED -> IN_TRANSIT -> DELIVERED", async () => {
  // DISPATCHED
  let up = await agent
    .patch(`/api/plt/deliveries/${S.delivery.id}/status`)
    .set(authz)
    .send({ status: "DISPATCHED", message: "Left supplier" })
    .expect(200);
  expect(up.body.status).toBe("DISPATCHED");

  // IN_TRANSIT
  up = await agent
    .patch(`/api/plt/deliveries/${S.delivery.id}/status`)
    .set(authz)
    .send({ status: "IN_TRANSIT", message: "On the road" })
    .expect(200);
  expect(up.body.status).toBe("IN_TRANSIT");

  // DELIVERED
  up = await agent
    .patch(`/api/plt/deliveries/${S.delivery.id}/status`)
    .set(authz)
    .send({ status: "DELIVERED", message: "Arrived at dock" })
    .expect(200);
  expect(up.body.status).toBe("DELIVERED");
});

  test("PLT: list by poId should include our delivery", async () => {
    const list = await agent.get(`/api/plt/deliveries?poId=${S.po.id}`).set(authz).expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.find(d => d.id === S.delivery.id)).toBeTruthy();
  });

  test("Procurement: post a Receipt for the PO (after PLT delivered)", async () => {
    const drNo = `DR-${Math.floor(Math.random()*1e9)}`;
    const rc = await agent.post("/api/procurement/receipts")
      .set(authz).send({ poNo: S.po.poNo, drNo, invoiceNo: `INV-${drNo}` }).expect(201);
    expect(rc.body?.receipt?.poId).toBe(S.po.id);
  });
});
