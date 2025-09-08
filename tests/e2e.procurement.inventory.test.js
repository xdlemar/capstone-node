const request = require("supertest");
const jwt = require("jsonwebtoken");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";
const JWT_SECRET  = process.env.JWT_SECRET  || "super_secret_dev";

// Inventory IDs (override in CI/local if yours differ)
const ITEM_ID     = Number(process.env.ITEM_ID     || 1);
const FROM_LOC_ID = Number(process.env.FROM_LOC_ID || 1);
const TO_LOC_ID   = Number(process.env.TO_LOC_ID   || 2);

// Optional: dev bootstrap endpoints (ignore if not present in your svc)
const DEV_SEED_ITEMS_EP     = process.env.DEV_SEED_ITEMS_EP     || "/api/inventory/dev/items";
const DEV_SEED_LOCATIONS_EP = process.env.DEV_SEED_LOCATIONS_EP || "/api/inventory/dev/locations";

describe("E2E: Procurement + Inventory via Gateway", () => {
  let agent;
  let token;
  let authz;

  const state = {
    vendor: null,
    pr: null,
    po: null,
    receipt: null,
    drNo: null,
  };

  beforeAll(() => {
    token = jwt.sign(
      { sub: "student1", name: "QA Runner", roles: ["inventory", "procurement"] },
      JWT_SECRET
    );
    authz = { Authorization: `Bearer ${token}` };
    agent = request(GATEWAY_URL);
  });

  test("health: inventory & procurement", async () => {
    const inv = await agent.get("/api/inventory/health").set(authz).expect(200);
    const pro = await agent.get("/api/procurement/health").set(authz).expect(200);
    expect(inv.body).toMatchObject({ ok: true, svc: "inventory" });
    expect(pro.body).toMatchObject({ ok: true, svc: "procurement" });
  });

  // ---------- OPTIONAL: try to bootstrap inventory master data ----------
  test("optional: ensure inventory master data exists (item & locations)", async () => {
    // These calls are best-effort and ignored if your service doesn't expose them.
    const tryPost = async (path, body) => {
      try {
        await agent.post(path).set(authz).send(body);
      } catch (_) { /* swallow */ }
    };
    await tryPost(DEV_SEED_ITEMS_EP,     { id: ITEM_ID, sku: "SKU-1", name: "Demo Item", unit: "ea" });
    await tryPost(DEV_SEED_LOCATIONS_EP, { id: FROM_LOC_ID, name: "Main Store", kind: "WAREHOUSE" });
    await tryPost(DEV_SEED_LOCATIONS_EP, { id: TO_LOC_ID,   name: "ER",         kind: "ROOM"       });
  });

  // ---------------------- PROCUREMENT FLOW ----------------------
  test("upsert vendor (MedSupply Co.)", async () => {
    const body = { name: "MedSupply Co.", email: "sales@medsupply.local" };
    const res = await agent
      .post("/api/procurement/vendors")
      .set(authz)
      .send(body)
      .expect(200);

    expect(res.body).toMatchObject({
      name: "MedSupply Co.",
      email: "sales@medsupply.local",
    });
    state.vendor = res.body;
  });

  test("create PR -> status SUBMITTED", async () => {
    const prNo = `PR-${Math.floor(Math.random() * 1e9)}`;
    const body = {
      prNo,
      notes: "ER resupply",
      lines: [{ itemId: ITEM_ID, qty: 500, unit: "pack" }],
    };
    const res = await agent
      .post("/api/procurement/pr")
      .set(authz)
      .send(body)
      .expect(200);

    expect(res.body).toMatchObject({ prNo, status: "SUBMITTED" });
    expect(res.body.lines?.length).toBe(1);
    state.pr = res.body;
  });

  test("approve PR -> status APPROVED", async () => {
    const prNo = state.pr.prNo;
    const res = await agent
      .post(`/api/procurement/pr/${encodeURIComponent(prNo)}/approve`)
      .set(authz)
      .expect(200);

    expect(res.body).toMatchObject({ prNo, status: "APPROVED" });
    expect(res.body.lines?.length).toBe(1);
    state.pr = res.body;
  });

  test("create PO from PR -> status OPEN", async () => {
    const poNo = `PO-${Math.floor(Math.random() * 1e9)}`;
    const body = { poNo, prNo: state.pr.prNo };
    const res = await agent
      .post("/api/procurement/po")
      .set(authz)
      .send(body)
      .expect(200);

    expect(res.body).toMatchObject({ poNo, status: "OPEN" });
    expect(res.body.vendor?.name).toBe("MedSupply Co.");
    expect(res.body.lines?.length).toBe(1);
    state.po = res.body;
  });

  test("post receipt (DR+Invoice) -> 201", async () => {
    const drNo = `DR-${Math.floor(Math.random() * 1e9)}`;
    const body = {
      poNo: state.po.poNo,
      drNo,
      invoiceNo: `INV-${drNo}`,
      // Lines optional in your current route; uncomment if required:
      // lines: [{ itemId: ITEM_ID, toLocId: FROM_LOC_ID, qty: 500 }]
    };
    const res = await agent
      .post("/api/procurement/receipts")
      .set(authz)
      .send(body)
      .expect(201);

    expect(res.body.receipt).toBeDefined();
    state.receipt = res.body.receipt;
    state.drNo = drNo;
  });

  test("add attachment (derive DR filename, storageKey)", async () => {
    const res = await agent
      .post("/api/procurement/attachments")
      .set(authz)
      .send({
        targetType: "PO",
        targetNo: state.po.poNo,
        kind: "DR",
        mimeType: "application/pdf",
        size: 204800,
      })
      .expect(201);

    expect(res.body.kind).toBe("DR");
    expect(res.body.storageKey).toContain(state.po.poNo);
  });

  test("list attachments by poNo -> returns at least 1", async () => {
    const res = await agent
      .get("/api/procurement/attachments")
      .query({ poNo: state.po.poNo })
      .set(authz)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  // ---------------------- INVENTORY FLOW ----------------------
  test("inventory: create ISSUE (requires Item & Locations to exist)", async () => {
    const issueNo = `ISS-${Math.floor(Math.random() * 1e9)}`;
    const body = {
      issueNo,
      fromLocId: FROM_LOC_ID,
      toLocId: TO_LOC_ID,
      lines: [{ itemId: ITEM_ID, qty: 3 }],
    };

    const res = await agent
      .post("/api/inventory/issues")
      .set(authz)
      .send(body);

    if (res.status === 400) {
      // Helpfully surface the likely cause
      throw new Error(
        `ISSUE failed with 400. Make sure Item(${ITEM_ID}) and Locations(${FROM_LOC_ID}, ${TO_LOC_ID}) exist. Body: ${JSON.stringify(res.body)}`
      );
    }
    expect(res.status).toBe(201);
    expect(res.body.issueNo).toBe(issueNo);
    expect(res.body.lines?.[0]?.qtyIssued).toBe(3);
  });

  test("inventory: create COUNT, then POST it (requires Location to exist)", async () => {
    const sessionNo = `CNT-${Math.floor(Math.random() * 1e9)}`;
    const body = {
      sessionNo,
      locationId: FROM_LOC_ID,
      lines: [{ itemId: ITEM_ID, countedQty: 10, systemQty: 9, variance: 1 }],
    };

    const create = await agent
      .post("/api/inventory/counts")
      .set(authz)
      .send(body);

    if (create.status === 400) {
      throw new Error(
        `COUNT create failed with 400. Ensure Location(${FROM_LOC_ID}) exists. Body: ${JSON.stringify(create.body)}`
      );
    }
    expect(create.status).toBe(201);
    expect(create.body.sessionNo).toBe(sessionNo);

    const post = await agent
      .post(`/api/inventory/counts/${encodeURIComponent(sessionNo)}/post`)
      .set(authz);

    if (post.status !== 200) {
      throw new Error(`COUNT post expected 200, got ${post.status}. Body: ${JSON.stringify(post.body)}`);
    }
    expect(post.body.status).toBe("POSTED");
  });
});
