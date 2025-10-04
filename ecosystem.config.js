module.exports = {
  apps: [
    {
      name: "gateway",
      script: "gateway/src/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 55559
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
        PORT: 4000
      }
    }
    ,
     {
      name: "plt-svc",
      script: "plt-svc/src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4005
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
