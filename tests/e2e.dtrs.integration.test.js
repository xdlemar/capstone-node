const request = require("supertest");
const jwt = require("jsonwebtoken");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";
const JWT_SECRET  = process.env.JWT_SECRET  || "super_secret_dev";
const ITEM_ID     = Number(process.env.ITEM_ID) || 1;

const makeAuthz = (roles, overrides = {}) => {
  const roleList = Array.isArray(roles) ? roles : [roles].filter(Boolean);
  const payload = { sub: "student1", roles: roleList, ...overrides };
  return { Authorization: `Bearer ${jwt.sign(payload, JWT_SECRET)}` };
};

describe("E2E: DTRS linked to PO & Delivery via Gateway", () => {
  let agent, authz;
  const S = {};

  beforeAll(() => {
    authz = makeAuthz(["ADMIN", "MANAGER", "STAFF"]);
    agent = request(GATEWAY_URL);
  });

  test("health", async () => {
    await agent.get("/api/dtrs/health").set(authz).expect(200);
    await agent.get("/api/procurement/health").set(authz).expect(200);
    await agent.get("/api/plt/health").set(authz).expect(200);
  });

  test("staff without scope cannot upload DTRS document", async () => {
    const staffAuth = makeAuthz(["STAFF"], { docScopes: { DELIVERY: [] } });
    await agent
      .post("/api/dtrs/documents")
      .set(staffAuth)
      .send({ module: "DELIVERY", title: "Denied", storageKey: "deny", uploaderId: 1 })
      .expect(403);
  });

  test("upsert vendor", async () => {
    const res = await agent
      .post("/api/procurement/vendors")
      .set(authz)
      .send({ name: "MedSupply Co.", email: "sales@medsupply.local" })
      .expect(200);
    S.vendor = res.body;
  });

  test("create PR -> approve -> PO", async () => {
    const prNo = `PR-${Math.floor(Math.random()*1e9)}`;
    const pr = await agent.post("/api/procurement/pr").set(authz).send({
      prNo, notes:"Docs flow", lines:[{ itemId:ITEM_ID, qty:50, unit:"box" }]
    }).expect(200);
    await agent.post(`/api/procurement/pr/${prNo}/approve`).set(authz).expect(200);

    const poNo = `PO-${Math.floor(Math.random()*1e9)}`;
    const po = await agent.post("/api/procurement/po").set(authz).send({ poNo, prNo, vendorId: S.vendor.id }).expect(200);
    S.po = po.body;
  });

  test("PLT: project + delivery tied to PO", async () => {
    const proj = await agent.post("/api/plt/projects").set(authz).send({
      code:`PRJ-${Math.floor(Math.random()*1e9)}`, name:"Docs Link"
    }).expect(200);
    S.project = proj.body;

    const del = await agent.post("/api/plt/deliveries").set(authz).send({
      projectId: S.project.id, poId: S.po.id,
      trackingNo:`TRK-${Math.floor(Math.random()*1e9)}`, eta:"2025-10-01T10:00:00Z"
    }).expect(201);
    S.delivery = del.body;
  });

  test("staff with DELIVERY scope can upload document", async () => {
    const scopedAuth = makeAuthz(["STAFF"], { docScopes: { DELIVERY: ["*"] } });
    const res = await agent
      .post("/api/dtrs/documents")
      .set(scopedAuth)
      .send({
        module: "DELIVERY",
        title: "Scoped Upload",
        storageKey: `deliveries/${S.delivery.id}/scoped-${Date.now()}.pdf`,
        mimeType: "application/pdf",
        deliveryId: S.delivery.id,
        uploaderId: 1,
      })
      .expect(201);
    expect(res.body.deliveryId).toBe(S.delivery.id);
    expect(res.body.module).toBe("DELIVERY");
  });

  test("DTRS: create doc for DELIVERY & for PO, then query", async () => {
    const d1 = await agent.post("/api/dtrs/documents").set(authz).send({
      module:"DELIVERY", title:"POD Photo", storageKey:`deliveries/${S.delivery.id}/pod.jpg`,
      mimeType:"image/jpeg", size:12345, deliveryId:S.delivery.id, uploaderId:1
    }).expect(201);
    expect(d1.body.deliveryId).toBe(S.delivery.id);

    const d2 = await agent.post("/api/dtrs/documents").set(authz).send({
      module:"PROCUREMENT", title:"PO PDF", storageKey:`pos/${S.po.id}/po.pdf`,
      mimeType:"application/pdf", size:45678, poId:S.po.id, uploaderId:1
    }).expect(201);
    expect(d2.body.poId).toBe(S.po.id);

    const q1 = await agent.get(`/api/dtrs/documents?deliveryId=${S.delivery.id}`).set(authz).expect(200);
    expect(q1.body.find(x => x.id === d1.body.id)).toBeTruthy();

    const q2 = await agent.get(`/api/dtrs/documents?module=PROCUREMENT&poId=${S.po.id}`).set(authz).expect(200);
    expect(q2.body.find(x => x.id === d2.body.id)).toBeTruthy();
  });
});

