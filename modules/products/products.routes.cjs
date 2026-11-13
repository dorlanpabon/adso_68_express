const router = require('express').Router();
const { validate } = require('../../middlewares/validate.cjs');
const { authenticate } = require('../../middlewares/auth.cjs');
const { authorize } = require('../../middlewares/authorize.cjs');
const controller = require('./products.controller.cjs');
const { listQuerySchema, createProductSchema, updateProductSchema } = require('./products.schemas.cjs');

// Público
router.get('/', validate(listQuerySchema, 'query'), controller.list);
// ADMIN (antes de /:idOrSlug para que "admin" no se interprete como slug)
router.get('/admin', authenticate, authorize('ADMIN'), validate(listQuerySchema, 'query'), controller.listAdmin);
router.get('/:idOrSlug', controller.getOne);

// ADMIN
router.post('/', authenticate, authorize('ADMIN'), validate(createProductSchema, 'body'), controller.create);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(updateProductSchema, 'body'), controller.update);

module.exports = router;
