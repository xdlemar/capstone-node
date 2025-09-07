const supertest = require("supertest");
const { base, authed } = require("./request");

describe("Health", () => {
  it("gateway /health ok", async () => {
    const res = await supertest(base).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("svc health ok", async () => {
    const h = await Promise.all([
      supertest(base).get("/api/auth/health"),
      authed().get("/api/inventory/health"),
      authed().get("/api/procurement/health"),
    ]);
    expect(h[0].status).toBe(200);
    expect(h[1].status).toBe(200);
    expect(h[2].status).toBe(200);
  });
});
