const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { authRequired, requireRole } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.set('json replacer', (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

const managerAccess = requireRole('MANAGER', 'ADMIN');
const vendorAccess = requireRole('VENDOR');

app.get('/health', (_req, res) => res.json({ ok: true, svc: 'plt' }));

app.use(authRequired);
app.use('/vendor', vendorAccess, require('./routes/vendorPortal'));
app.use('/vendor-users', managerAccess, require('./routes/vendorUsers'));
app.use('/internal', managerAccess, require('./routes/internal'));
app.use(managerAccess);

app.use('/projects', require('./routes/projects'));
app.use('/deliveries', require('./routes/deliveries'));
app.use('/alerts', require('./routes/alerts'));
app.use('/dashboard', require('./routes/dashboard'));

module.exports = app;

