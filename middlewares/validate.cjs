// Validación de requests con Zod.
// Uso: router.post('/ruta', validate(schema, 'body'), handler)
// Fuentes soportadas: body, query, params.

const { ApiError } = require('./errorHandler.cjs');

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] || {});
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first ? `${first.path.join('.') || 'campo'}: ${first.message}` : 'Datos inválidos';
    return next(new ApiError(400, message, 'VALIDATION_ERROR'));
  }
  // El body se reemplaza por los datos saneados; para query/params se guardan
  // aparte (Express 5 no permite reasignar req.query de forma fiable).
  if (source === 'body') {
    req.body = result.data;
  } else {
    req.validated = req.validated || {};
    req.validated[source] = result.data;
  }
  return next();
};

module.exports = { validate };
