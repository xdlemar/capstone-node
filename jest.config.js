module.exports = {
  testEnvironment: "node",
  testTimeout: 30000,                // plenty for first pass; tune later
  reporters: ["default"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/hospital-web/"],
};
