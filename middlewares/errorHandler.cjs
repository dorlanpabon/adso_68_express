// Errores de aplicación y manejo centralizado de respuestas.

class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.expose = true; // los ApiError son seguros para mostrar al cliente
  }
}

// Formato de respuesta consistente acordado: { success, data, error, meta }
const ok = (res, data, meta = undefined, statusCode = 200) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

const fail = (res, statusCode, message, code = 'ERROR') =>
  res.status(statusCode).json({ success: false, error: { code, message } });

// 404 para rutas no registradas (JSON, ya no texto plano de Express 5)
function notFoundHandler(req, res) {
  return fail(res, 404, 'Ruta no encontrada', 'NOT_FOUND');
}

// Middleware central de errores: nunca filtra stack ni SQL al cliente.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Errores de MySQL/pool: mensaje genérico hacia afuera, detalle en consola.
  const isApiError = err instanceof ApiError && err.expose;
  const statusCode = isApiError ? err.statusCode : err && err.statusCode ? err.statusCode : 500;
  const message = isApiError || (err && err.expose) ? err.message : 'Error interno del servidor';

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', req.method, req.originalUrl, err);
  }

  return fail(res, statusCode, message, (err && err.code) || 'ERROR');
}

module.exports = { ApiError, ok, fail, notFoundHandler, errorHandler };
