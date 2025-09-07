// tests/request.js
require("dotenv").config({ path: "tests/.env.test", override: true });

const supertest = require("supertest");
const jwt = require("jsonwebtoken");

const base = process.env.GW_URL || "http://localhost:8080";

/** Build a valid JWT for the gateway */
function token(claims = {}) {
  const payload = {
    sub: "tester",
    roles: ["ADMIN"],
    ...claims,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

/** Return a tiny client with get/post/put/patch/delete, each with Bearer token */
function authed(claims) {
  const t = token(claims);
  const agent = supertest.agent(base);
  const withAuth = (req) => req.set("Authorization", `Bearer ${t}`);

  return {
    get: (p) => withAuth(agent.get(p)),
    post: (p) => withAuth(agent.post(p)),
    put: (p) => withAuth(agent.put(p)),
    patch: (p) => withAuth(agent.patch(p)),
    delete: (p) => withAuth(agent.delete(p)),
  };
}

module.exports = { base, authed, token };
