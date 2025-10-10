const path = require("path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "..", ".env");
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn(`[alms-svc] Unable to load ${envPath}: ${result.error.message}`);
  dotenv.config();
}

const app = require("./app");
const port = Number(process.env.PORT || 4007);
app.listen(port, () => console.log(`alms-svc on http://localhost:${port}`));
