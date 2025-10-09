// tests/e2e.alms.crud.test.js (CommonJS)
const request = require("supertest");
const jwt = require("jsonwebtoken");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";
const JWT_SECRET  = process.env.JWT_SECRET  || "super_secret_dev";
const ASSET_CODE_PREFIX = process.env.ASSET_CODE_PREFIX || "EQ-";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeAuthz = (...roles) => ({
  Authorization: `Bearer ${jwt.sign({ sub: "student1", name: "ALMS Runner", roles }, JWT_SECRET)}`,
});

describe("E2E: ALMS CRUD via Gateway", () => {
  let agent, authz;
  const S = {};

  beforeAll(() => {
    authz = makeAuthz("ADMIN", "MANAGER", "STAFF");
    agent = request(GATEWAY_URL);
  });

  test("health", async () => {
    await agent.get("/api/alms/health").set(authz).expect(200);
  });

  test("staff cannot create asset", async () => {
    const staffAuth = makeAuthz("STAFF");
    await agent
      .post("/api/alms/assets")
      .set(staffAuth)
      .send({ assetCode: "EQ-STAFF", itemId: 1, serialNo: "SN-BLOCKED" })
      .expect(403);
  });

  // ---------- ASSETS ----------
  test("assets: create", async () => {
    const body = {
      itemId: 1, // scalar link only
      serialNo: "SN-ALMS-001",
      category: "VENTILATOR",
      acquisitionCost: 250000,
      vendorId: 1,
      locationId: 1,
      notes: "ICU ventilator"
    };
    const res = await agent.post("/api/alms/assets").set(authz).send(body).expect(201);
    const prefixPattern = new RegExp(`^${escapeRegex(ASSET_CODE_PREFIX)}`);
    expect(res.body.assetCode).toEqual(expect.stringMatching(prefixPattern));
    S.asset = res.body; // bigint fields are strings via gateway replacer
  });

  test("assets: list with filters & pagination", async () => {
    const res = await agent
      .get("/api/alms/assets")
      .query({ q: "VENTILATOR", status: "ACTIVE", take: 5 })
      .set(authz)
      .expect(200);
    expect(typeof res.body.total).toBe("number");
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body.rows.length).toBeGreaterThan(0);
  });

  test("assets: read by id", async () => {
    const res = await agent.get(`/api/alms/assets/${S.asset.id}`).set(authz).expect(200);
    expect(res.body.id).toBe(String(S.asset.id));
    expect(res.body.assetCode).toBe(S.asset.assetCode);
  });

  test("assets: patch partial update", async () => {
    const res = await agent
      .patch(`/api/alms/assets/${S.asset.id}`)
      .set(authz)
      .send({ notes: "ICU ventilator - updated" })
      .expect(200);
    expect(res.body.notes).toMatch(/updated/);
  });

  test("assets: put full update", async () => {
    const payload = {
      assetCode: S.asset.assetCode, // keep same code
      itemId: 1,
      serialNo: "SN-ALMS-001A",
      category: "VENTILATOR",
      acquisitionCost: 260000,
      vendorId: 1,
      warrantyUntil: "2026-12-31T00:00:00Z",
      status: "ACTIVE",
      locationId: 2,
      notes: "moved to stepdown"
    };
    const res = await agent
      .put(`/api/alms/assets/${S.asset.id}`)
      .set(authz)
      .send(payload)
      .expect(200);
    expect(res.body.serialNo).toBe("SN-ALMS-001A");
    expect(res.body.locationId).toBe("2");
  });

  // ---------- SCHEDULES ----------
  test("schedules: create list read update delete", async () => {
    const create = await agent.post("/api/alms/schedules").set(authz).send({
      assetId: S.asset.id,
      type: "PREVENTIVE",
      intervalDays: 180,
      nextDue: "2025-12-01T00:00:00Z",
      notes: "Semi-annual PM"
    }).expect(201);
    S.sched = create.body;

    const list = await agent
      .get("/api/alms/schedules")
      .query({ assetId: S.asset.id, take: 10 })
      .set(authz)
      .expect(200);
    expect(list.body.rows.find(r => r.id === S.sched.id)).toBeTruthy();

    const read = await agent.get(`/api/alms/schedules/${S.sched.id}`).set(authz).expect(200);
    expect(read.body.id).toBe(S.sched.id);

    const upd = await agent.put(`/api/alms/schedules/${S.sched.id}`).set(authz).send({
      type: "PREVENTIVE",
      intervalDays: 90,
      nextDue: "2025-11-01T00:00:00Z",
      notes: "Quarterly PM"
    }).expect(200);
    expect(upd.body.intervalDays).toBe(90);

    await agent.delete(`/api/alms/schedules/${S.sched.id}`).set(authz).expect(204);
  });

  // ---------- WORK ORDERS ----------
  test("workorder: open -> scheduled -> in_progress -> complete (with repair log & asset status flip)", async () => {
    const woNo = `WO-${Math.floor(Math.random() * 1e9)}`;
    const open = await agent.post("/api/alms/workorders").set(authz).send({
      woNo, assetId: S.asset.id, type: "INSPECTION", notes: "check alarms", scheduledAt: "2025-09-20T04:00:00Z"
    }).expect(201);
    S.wo = open.body;

    const list = await agent.get("/api/alms/workorders").query({ q: woNo }).set(authz).expect(200);
    expect(list.body.rows.find(w => w.id === S.wo.id)).toBeTruthy();

    const read = await agent.get(`/api/alms/workorders/${S.wo.id}`).set(authz).expect(200);
    expect(read.body.woNo).toBe(woNo);

    await agent.patch(`/api/alms/workorders/${S.wo.id}/status`).set(authz).send({ status: "SCHEDULED" }).expect(200);
    await agent.patch(`/api/alms/workorders/${S.wo.id}/status`).set(authz).send({ status: "IN_PROGRESS", technician: "Tech B" }).expect(200);
    const done = await agent.patch(`/api/alms/workorders/${S.wo.id}/status`).set(authz).send({
      status: "COMPLETED", message: "Replaced filter kit", cost: 1200
    }).expect(200);
    expect(done.body.status).toBe("COMPLETED");
  });

  // ---------- REPAIRS / TRANSFERS / DISPOSALS ----------
  test("repairs: manual repair log + list/read", async () => {
    const created = await agent.post("/api/alms/repairs").set(authz).send({
      assetId: S.asset.id, description: "Tightened fittings", cost: 100
    }).expect(201);
    S.repair = created.body;

    const list = await agent.get("/api/alms/repairs").query({ assetId: S.asset.id }).set(authz).expect(200);
    expect(list.body.rows.find(r => r.id === S.repair.id)).toBeTruthy();

    const read = await agent.get(`/api/alms/repairs/${S.repair.id}`).set(authz).expect(200);
    expect(read.body.description).toMatch(/Tightened/);
  });

  test("transfers: create + list/read", async () => {
    const created = await agent.post("/api/alms/transfers").set(authz).send({
      assetId: S.asset.id, fromLocId: 2, toLocId: 1, notes: "return to ICU"
    }).expect(201);
    S.transfer = created.body;
    expect(created.body.toLocId).toBe("1");

    const list = await agent.get("/api/alms/transfers").query({ assetId: S.asset.id }).set(authz).expect(200);
    expect(list.body.rows.find(t => t.id === S.transfer.id)).toBeTruthy();

    const read = await agent.get(`/api/alms/transfers/${S.transfer.id}`).set(authz).expect(200);
    expect(read.body.assetId).toBe(String(S.asset.id));
  });

  test("disposals: create + list/read", async () => {
    const created = await agent.post("/api/alms/disposals").set(authz).send({
      assetId: S.asset.id, reason: "End of life", proceeds: 5000, approvedById: 1
    }).expect(201);
    S.disposal = created.body;

    const list = await agent.get("/api/alms/disposals").query({ assetId: S.asset.id }).set(authz).expect(200);
    expect(list.body.rows.find(d => d.id === S.disposal.id)).toBeTruthy();

    const read = await agent.get(`/api/alms/disposals/${S.disposal.id}`).set(authz).expect(200);
    expect(read.body.assetId).toBe(String(S.asset.id));
  });
});
