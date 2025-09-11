require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT || 4005);
app.listen(port, () => console.log(`plt-svc running on http://localhost:${port}`));

