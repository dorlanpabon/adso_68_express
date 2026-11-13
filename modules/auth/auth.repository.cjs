// Acceso a datos de usuarios. Sin lógica de negocio aquí.

const pool = require('../../utils/db.cjs');

// Con rol (LEFT JOIN: usuarios legacy aún pueden tener role_id NULL).
const findByUsuario = async (usuario) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.usuario, u.clave, u.is_active, r.code AS role_code
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.usuario = ? LIMIT 1`,
    [usuario]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.usuario, u.is_active, r.code AS role_code
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const insertUsuario = async (usuario, claveHash, roleId) => {
  const [result] = await pool.query(
    'INSERT INTO usuarios (usuario, clave, role_id) VALUES (?, ?, ?)',
    [usuario, claveHash, roleId]
  );
  return result.insertId;
};

const findRoleIdByCode = async (code) => {
  const [rows] = await pool.query('SELECT id FROM roles WHERE code = ? LIMIT 1', [code]);
  return rows[0] ? rows[0].id : null;
};

module.exports = { findByUsuario, findById, insertUsuario, findRoleIdByCode };
