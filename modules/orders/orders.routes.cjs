const router = require('express').Router();
const { validate } = require('../../middlewares/validate.cjs');
const { authenticate } = require('../../middlewares/auth.cjs');
const { authorize } = require('../../middlewares/authorize.cjs');
const controller = require('./orders.controller.cjs');
const { checkoutSchema, listQuerySchema } = require('./orders.schemas.cjs');

// Todo el módulo requiere sesión y un rol asignado (comprador autenticado;
// el rol solo cambia qué pedidos puede VER, validado en el service).
router.use(authenticate, authorize());

// POST /api/v1/orders/checkout (transaccional + idempotente)
router.post('/checkout', validate(checkoutSchema, 'body'), controller.checkout);

// GET /api/v1/orders/mine
router.get('/mine', validate(listQuerySchema, 'query'), controller.listMine);

// GET /api/v1/orders/:id — propietario o ADMIN (validado en service)
router.get('/:id', controller.getDetail);

// POST /api/v1/orders/:id/cancel — propietario o ADMIN; restaura stock
router.post('/:id/cancel', controller.cancel);

module.exports = router;
