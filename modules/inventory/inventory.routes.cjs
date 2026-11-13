const router = require('express').Router();
const { validate } = require('../../middlewares/validate.cjs');
const { authenticate } = require('../../middlewares/auth.cjs');
const { authorize } = require('../../middlewares/authorize.cjs');
const controller = require('./inventory.controller.cjs');
const { createMovementSchema, listQuerySchema, balancesQuerySchema } = require('./inventory.schemas.cjs');

// Todo el módulo requiere sesión + rol ADMIN o WAREHOUSE.
router.use(authenticate, authorize('ADMIN', 'WAREHOUSE'));

// GET /api/v1/inventory/warehouses
router.get('/warehouses', controller.listWarehouses);

// GET /api/v1/inventory/balances?warehouseId&productId&lowStock=1
router.get('/balances', validate(balancesQuerySchema, 'query'), controller.listBalances);

// GET /api/v1/inventory/movements?productId&warehouseId&type&page&limit
router.get('/movements', validate(listQuerySchema, 'query'), controller.listMovements);

// POST /api/v1/inventory/movements
router.post('/movements', validate(createMovementSchema, 'body'), controller.createMovement);

module.exports = router;
