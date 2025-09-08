module.exports = {
  apps: [
    {
      name: "gateway",
      script: "gateway/src/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 8080
      }
    },
    {
      name: "inventory-svc",
      script: "inventory-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4001
      }
    },
    {
      name: "procurement-svc",
      script: "procurement-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4002
      }
    },
     {
      name: "auth-svc",
      script: "auth-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4002
      }
    }
  ]
};
