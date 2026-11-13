// Registro de acciones sensibles en audit_logs (fallo silencioso y logueado:
// la auditoría nunca debe romper la operación principal).

const pool = require('./db.cjs');

const logAction = async (actorUserId, action, entityType, entityId, metadata = null) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)',
      [actorUserId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[audit] No se pudo registrar la acción:', error.message);
  }
};

module.exports = { logAction };
