// tests/e2e.plt.js
const request = require("supertest");
const jwt = require("jsonwebtoken");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";
const JWT_SECRET  = process.env.JWT_SECRET  || "super_secret_dev";

describe("E2E: PLT via Gateway", () => {
  let agent, authz, token, state = {};

  beforeAll(() => {
    token = jwt.sign(
      { sub: "student1", name: "QA Runner", roles: ["plt","inventory","procurement"] },
      JWT_SECRET
    );
    authz = { Authorization: `Bearer ${token}` };
    agent = request(GATEWAY_URL);
  });

  test("health (gateway reachable)", async () => {
    const gw = await agent.get("/health").expect(200);
    expect(gw.body).toMatchObject({ ok: true, svc: "gateway" });
  });

  test("create project", async () => {
    const body = { code: `PRJ-${Math.floor(Math.random()*1e9)}`, name: "Radiology Upgrade" };
    const res = await agent.post("/api/plt/projects").set(authz).send(body).expect(200);
    expect(res.body).toMatchObject({ code: body.code, name: body.name, status: "PLANNING" });
    state.project = res.body;
  });

  test("create delivery under project", async () => {
    const body = {
      projectId: state.project.id,
      trackingNo: `TRK-${Math.floor(Math.random()*1e9)}`,
      eta: "2025-10-01T10:00:00Z"
    };
    const res = await agent.post("/api/plt/deliveries").set(authz).send(body).expect(200);
    expect(res.body).toMatchObject({ projectId: state.project.id, status: "DRAFT" });
    state.delivery = res.body;
  });

  test("update delivery status (DISPATCHED)", async () => {
    const res = await agent
      .patch(`/api/plt/deliveries/${state.delivery.id}/status`)
      .set(authz)
      .send({ status: "DISPATCHED", message: "Left supplier" })
      .expect(200);

    expect(res.body).toMatchObject({ id: state.delivery.id, status: "DISPATCHED" });
  });
});
