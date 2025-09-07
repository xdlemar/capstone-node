module.exports = {
  testEnvironment: "node",
  testTimeout: 30000,                // plenty for first pass; tune later
  setupFiles: ["<rootDir>/tests/setup-env.js"],
  reporters: ["default"],
};
