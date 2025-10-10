const path = require("path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "..", ".env");
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn(`[dtrs-svc] Unable to load ${envPath}: ${result.error.message}`);
  dotenv.config();
}

const app = require("./app");

const port = Number(process.env.PORT || 4006);
app.listen(port, () => console.log(`dtrs-svc listening on ${port}`));
