module.exports = {
  apps: [
    {
      name: "gateway",
      script: "gateway/src/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 55559,
        JWT_SECRET: "ABAD_SECRET",
        JWT_EXPIRES: "12h",
        AUTH_URL: "http://127.0.0.1:4000",
        INVENTORY_URL: "http://127.0.0.1:4001",
        PROCUREMENT_URL: "http://127.0.0.1:4002",
        PLT_URL: "http://127.0.0.1:4005",
        DTRS_URL: "http://127.0.0.1:4006",
        ALMS_URL: "http://127.0.0.1:4007",
      }
    },
    {
      name: "auth-svc",
      script: "auth-svc/src/server.js",
      env: { NODE_ENV: "production", PORT: 4000 }
    },
    {
      name: "inventory-svc",
      script: "inventory-svc/src/server.js",
      env: { NODE_ENV: "production", PORT: 4001 }
    },
    {
      name: "procurement-svc",
      script: "procurement-svc/src/server.js",
      env: { NODE_ENV: "production", PORT: 4002, PLT_URL: "http://127.0.0.1:4005" }
    },
    {
      name: "plt-svc",
      script: "plt-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4005,
        PROCUREMENT_URL: "http://127.0.0.1:4002"
      }
    },
    {
      name: "dtrs-svc",
      script: "dtrs-svc/src/server.js",
      env: { NODE_ENV: "production", PORT: 4006 }
    },
    {
      name: "alms-svc",
      script: "alms-svc/src/server.js",
      env: { NODE_ENV: "production", PORT: 4007 }
    }
  ]
};
