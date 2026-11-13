// Middleware de autenticación: valida el Bearer token JWT.
// Deja req.user = { id, usuario } (payload del token).

const { ApiError } = require('./errorHandler.cjs');
const { verificarToken } = require('../utils/jwt.js');

const authenticate = (req, res, next) => {
  const header = req.headers['authorization'] || '';
  // Aceptar "Bearer <token>" y también el token pelado (compatibilidad con el cliente actual).
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
  const decoded = token ? verificarToken(token) : null;

  if (!decoded) {
    return next(new ApiError(401, 'No autenticado: token ausente o inválido', 'UNAUTHORIZED'));
  }

  req.user = decoded; // { id?, usuario }
  return next();
};

module.exports = { authenticate };
