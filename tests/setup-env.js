const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "env.stack.test") });
dotenv.config({ path: path.join(__dirname, ".env.test") });