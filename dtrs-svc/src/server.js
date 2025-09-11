require("dotenv").config();
const app = require("./app");

const port = Number(process.env.PORT || 4006);
app.listen(port, () => console.log(`dtrs-svc listening on ${port}`));
