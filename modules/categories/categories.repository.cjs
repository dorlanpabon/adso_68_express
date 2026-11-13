const pool = require('../../utils/db.cjs');

const list = async ({ includeInactive = false } = {}) => {
  const sql = `SELECT id, name, slug, description, active, created_at, updated_at
                 FROM categories
                ${includeInactive ? '' : 'WHERE active = 1'}
                ORDER BY name ASC`;
  const [rows] = await pool.query(sql);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query('SELECT id, name, slug, description, active FROM categories WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const findBySlug = async (slug) => {
  const [rows] = await pool.query('SELECT id, name, slug, active FROM categories WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
};

const create = async ({ name, slug, description = null, active = true }) => {
  const [result] = await pool.query(
    'INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, ?)',
    [name, slug, description, active]
  );
  return result.insertId;
};

const update = async (id, data) => {
  const fields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    params.push(value);
  }
  params.push(id);
  const [result] = await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
};

module.exports = { list, findById, findBySlug, create, update };
