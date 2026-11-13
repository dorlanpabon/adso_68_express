// Middleware de autorización por rol. Se usa DESPUÉS de authenticate.
// authorize()             → exige tener algún rol asignado
// authorize('ADMIN')      → solo ADMIN
// authorize('ADMIN','WAREHOUSE') → cualquiera de esos roles
// El rol se lee FRESCO de la BD (no del token): cambiar rol surte efecto al instante.

const { ApiError } = require('./errorHandler.cjs');
const pool = require('../utils/db.cjs');

const authorize = (...codes) => async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, 'No autenticado', 'UNAUTHORIZED'));
    }

    const [rows] = await pool.query(
      `SELECT r.code
         FROM usuarios u
         JOIN roles r ON r.id = u.role_id
        WHERE u.id = ? AND u.is_active = 1
        LIMIT 1`,
      [req.user.id]
    );

    const roleCode = rows[0] ? rows[0].code : null;

    if (!roleCode) {
      return next(new ApiError(403, 'El usuario no tiene un rol asignado', 'FORBIDDEN'));
    }
    if (codes.length > 0 && !codes.includes(roleCode)) {
      return next(new ApiError(403, 'No autorizado para esta operación', 'FORBIDDEN'));
    }

    req.roleCode = roleCode;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { authorize };
