const path = require("path");
const dotenv = require("dotenv");

// Load stack-level env first (CI writes root env.stack.test), then local overrides.
[
  path.join(__dirname, "env.stack.test"),
  path.join(__dirname, "..", "env.stack.test"),
].forEach((candidate) => {
  dotenv.config({ path: candidate });
});

dotenv.config({ path: path.join(__dirname, ".env.test") });
