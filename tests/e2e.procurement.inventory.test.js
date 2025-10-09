const request = require("supertest");
const jwt = require("jsonwebtoken");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev";

// Inventory IDs (override in CI/local if yours differ)
const ITEM_ID = Number(process.env.ITEM_ID || 1);
const FROM_LOC_ID = Number(process.env.FROM_LOC_ID || 1);
const TO_LOC_ID = Number(process.env.TO_LOC_ID || 2);

// Optional: dev bootstrap endpoints (ignore if not present in your svc)
const DEV_SEED_ITEMS_EP = process.env.DEV_SEED_ITEMS_EP || "/api/inventory/dev/items";
const DEV_SEED_LOCATIONS_EP = process.env.DEV_SEED_LOCATIONS_EP || "/api/inventory/dev/locations";

const RECEIPT_QTY = Number(process.env.TEST_RECEIPT_QTY || 200);
const TRANSFER_QTY = Number(process.env.TEST_TRANSFER_QTY || 25);

const makeAuthz = (...roles) => ({
  Authorization: `Bearer ${jwt.sign({ sub: "student1", roles }, JWT_SECRET)}`,
});

const fetchOnHand = async (agent, authz, locationId) => {
  const res = await agent
    .get("/api/inventory/reports/levels")
    .query({ locationId })
    .set(authz)
    .expect(200);

  const entry = Array.isArray(res.body)
    ? res.body.find((row) => Number(row.itemId) === ITEM_ID)
    : null;

  return entry ? Number(entry.onhand) : 0;
};

describe("E2E: Procurement + Inventory via Gateway", () => {
  let agent;
  let authz;

  const state = {
    vendor: null,
    pr: null,
    po: null,
    receipt: null,
    drNo: null,
    onHand: {
      fromBeforeReceipt: 0,
      fromAfterReceipt: 0,
    },
  };

  beforeAll(() => {
    authz = makeAuthz("ADMIN", "MANAGER", "STAFF");
    agent = request(GATEWAY_URL);
  });

  test("health: inventory & procurement", async () => {
    const inv = await agent.get("/api/inventory/health").set(authz).expect(200);
    const pro = await agent.get("/api/procurement/health").set(authz).expect(200);
    expect(inv.body).toMatchObject({ ok: true, svc: "inventory" });
    expect(pro.body).toMatchObject({ ok: true, svc: "procurement" });
  });

  test("optional: ensure inventory master data exists (item & locations)", async () => {
    const tryPost = async (path, body) => {
      try {
        await agent.post(path).set(authz).send(body);
      } catch (_) {
        /* ignore */
      }
    };
    await tryPost(DEV_SEED_ITEMS_EP, {
      id: ITEM_ID,
      sku: "SKU-1",
      name: "Demo Item",
      unit: "ea",
    });
    await tryPost(DEV_SEED_LOCATIONS_EP, {
      id: FROM_LOC_ID,
      name: "Main Store",
      kind: "WAREHOUSE",
    });
    await tryPost(DEV_SEED_LOCATIONS_EP, {
      id: TO_LOC_ID,
      name: "ER",
      kind: "ROOM",
    });
  });

  test("staff cannot approve PR", async () => {
    const staffAuth = makeAuthz("STAFF");
    const prNo = `PR-STAFF-${Math.floor(Math.random() * 1e9)}`;
    await agent
      .post("/api/procurement/pr")
      .set(staffAuth)
      .send({
        prNo,
        notes: "Test staff restrictions",
        lines: [{ itemId: ITEM_ID, qty: 1, unit: "box" }],
      })
      .expect(200);

    await agent
      .post(`/api/procurement/pr/${encodeURIComponent(prNo)}/approve`)
      .set(staffAuth)
      .expect(403);
  });

  test("upsert vendor (MedSupply Co.)", async () => {
    const body = { name: "MedSupply Co.", email: "sales@medsupply.local" };
    const res = await agent.post("/api/procurement/vendors").set(authz).send(body).expect(200);

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
      lines: [{ itemId: ITEM_ID, qty: RECEIPT_QTY, unit: "pack" }],
    };
    const res = await agent.post("/api/procurement/pr").set(authz).send(body).expect(200);

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
    const res = await agent.post("/api/procurement/po").set(authz).send(body).expect(200);

    expect(res.body).toMatchObject({ poNo, status: "OPEN" });
    expect(res.body.lines?.length).toBe(1);
    state.po = res.body;
  });

  test("post receipt (lines -> adds stock at FROM)", async () => {
    const drNo = `DR-${Math.floor(Math.random() * 1e9)}`;

    state.onHand.fromBeforeReceipt = await fetchOnHand(agent, authz, FROM_LOC_ID);

    const body = {
      poNo: state.po.poNo,
      drNo,
      invoiceNo: `INV-${drNo}`,
      lines: [{ itemId: ITEM_ID, toLocId: FROM_LOC_ID, qty: RECEIPT_QTY }],
    };
    const res = await agent.post("/api/procurement/receipts").set(authz).send(body).expect(201);

    state.receipt = res.body.receipt;
    state.drNo = drNo;

    state.onHand.fromAfterReceipt = await fetchOnHand(agent, authz, FROM_LOC_ID);
    expect(state.onHand.fromAfterReceipt).toBe(
      state.onHand.fromBeforeReceipt + RECEIPT_QTY,
    );
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

  test("inventory: create ISSUE (requires Item & Locations to exist)", async () => {
    const issueNo = `ISS-${Math.floor(Math.random() * 1e9)}`;
    const body = {
      issueNo,
      fromLocId: FROM_LOC_ID,
      toLocId: TO_LOC_ID,
      lines: [{ itemId: ITEM_ID, qty: 3 }],
    };

    const res = await agent.post("/api/inventory/issues").set(authz).send(body);

    if (res.status === 400) {
      throw new Error(
        `ISSUE failed with 400. Make sure Item(${ITEM_ID}) and Locations(${FROM_LOC_ID}, ${TO_LOC_ID}) exist. Body: ${JSON.stringify(
          res.body,
        )}`,
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

    const create = await agent.post("/api/inventory/counts").set(authz).send(body);

    if (create.status === 400) {
      throw new Error(
        `COUNT create failed with 400. Ensure Location(${FROM_LOC_ID}) exists. Body: ${JSON.stringify(
          create.body,
        )}`,
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

  test("inventory: transfer shifts stock between locations", async () => {
    let fromOnHand = await fetchOnHand(agent, authz, FROM_LOC_ID);
    if (fromOnHand < TRANSFER_QTY) {
      const topUpQty = TRANSFER_QTY - fromOnHand + 10;
      await agent
        .post("/api/inventory/stock-moves")
        .set(authz)
        .send({
          itemId: ITEM_ID,
          qty: topUpQty,
          reason: "RECEIPT",
          toLocId: FROM_LOC_ID,
        })
        .expect(201);
      fromOnHand = await fetchOnHand(agent, authz, FROM_LOC_ID);
    }

    const toOnHand = await fetchOnHand(agent, authz, TO_LOC_ID);

    const transferNo = `TR-${Math.floor(Math.random() * 1e9)}`;
    const staffAuth = makeAuthz("STAFF");
    const createRes = await agent
      .post("/api/inventory/transfers")
      .set(staffAuth)
      .send({
        transferNo,
        fromLocId: FROM_LOC_ID,
        toLocId: TO_LOC_ID,
        lines: [{ itemId: ITEM_ID, qty: TRANSFER_QTY }],
      })
      .expect(201);

    expect(createRes.body.status).toBe("PENDING");

    // Stock levels remain unchanged until approval
    const fromAfterPending = await fetchOnHand(agent, authz, FROM_LOC_ID);
    const toAfterPending = await fetchOnHand(agent, authz, TO_LOC_ID);
    expect(fromAfterPending).toBe(fromOnHand);
    expect(toAfterPending).toBe(toOnHand);

    await agent.post(`/api/inventory/transfers/${createRes.body.id}/approve`).set(authz).expect(200);

    const fromAfter = await fetchOnHand(agent, authz, FROM_LOC_ID);
    const toAfter = await fetchOnHand(agent, authz, TO_LOC_ID);

    expect(fromAfter).toBe(fromOnHand - TRANSFER_QTY);
    expect(toAfter).toBe(toOnHand + TRANSFER_QTY);
  });

  test("staff cannot list inventory master data", async () => {
    const staffAuth = makeAuthz("STAFF");
    await agent.get("/api/inventory/items").set(staffAuth).expect(403);
  });
});
