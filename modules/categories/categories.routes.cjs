const router = require('express').Router();
const { validate } = require('../../middlewares/validate.cjs');
const { authenticate } = require('../../middlewares/auth.cjs');
const { authorize } = require('../../middlewares/authorize.cjs');
const controller = require('./categories.controller.cjs');
const { createCategorySchema, updateCategorySchema } = require('./categories.schemas.cjs');

// Público
router.get('/', controller.list);

// ADMIN
router.post('/', authenticate, authorize('ADMIN'), validate(createCategorySchema, 'body'), controller.create);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(updateCategorySchema, 'body'), controller.update);

module.exports = router;
