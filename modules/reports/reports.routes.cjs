const router = require('express').Router();
const { validate } = require('../../middlewares/validate.cjs');
const { authenticate } = require('../../middlewares/auth.cjs');
const { authorize } = require('../../middlewares/authorize.cjs');
const controller = require('./reports.controller.cjs');
const { dashboardQuerySchema } = require('./reports.schemas.cjs');

// Los reportes son información interna: solo ADMIN.
router.get('/dashboard', authenticate, authorize('ADMIN'), validate(dashboardQuerySchema, 'query'), controller.dashboard);

module.exports = router;
