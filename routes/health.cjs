// GET /api/v1/health — verificación de vida del servicio (sin datos sensibles).

const { ok } = require('../middlewares/errorHandler.cjs');

async function health(req, res, next) {
  try {
    return ok(res, {
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      // La hora sirve para detectar cold starts / reinicios en despliegue.
      time: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = health;
