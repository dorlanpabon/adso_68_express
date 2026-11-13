// Rutas /api/v1/auth

const router = require('express').Router();
const { validate } = require('../../middlewares/validate.cjs');
const { authenticate } = require('../../middlewares/auth.cjs');
const controller = require('./auth.controller.cjs');
const { loginSchema, registerSchema } = require('./auth.schemas.cjs');

router.post('/register', validate(registerSchema, 'body'), controller.register);
router.post('/login', validate(loginSchema, 'body'), controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
