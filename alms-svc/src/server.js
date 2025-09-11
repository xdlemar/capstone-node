require("dotenv").config();
const app = require("./app");
const port = Number(process.env.PORT || 4007);
app.listen(port, () => console.log(`alms-svc on http://localhost:${port}`));
