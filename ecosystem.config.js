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
        PORT: 4000,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES: "8h"
      }
    }
    ,
     {
      name: "plt-svc",
      script: "plt-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4005,
        JWT_SECRET: process.env.JWT_SECRET,
        AUTH_URL: "http://localhost:4000",
      }
    }
     ,
     {
      name: "dtrs-svc",
      script: "dtrs-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4006
      }
    }
     ,
     {
      name: "alms-svc",
      script: "alms-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4007
      }
    }
  ]
};
