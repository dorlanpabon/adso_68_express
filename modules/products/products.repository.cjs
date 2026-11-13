// Acceso a datos de productos. Nombres de orden/limit whiteliste desde el service.

const pool = require('../../utils/db.cjs');

// DECIMAL llega como string desde mysql2: se convierte a Number para la API.
const mapProduct = (row) => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  slug: row.slug,
  description: row.description,
  type: row.type,
  price: row.price === null ? null : Number(row.price),
  cost: row.cost === null ? null : Number(row.cost),
  minStock: row.min_stock === null ? null : Number(row.min_stock),
  categoryId: row.category_id,
  categoryName: row.category_name || null,
  categorySlug: row.category_slug || null,
  imageUrl: row.image_url,
  active: row.active === 1,
  createdAt: row.created_at,
});

const SORT_COLUMNS = {
  created_desc: 'p.created_at DESC',
  created_asc: 'p.created_at ASC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
};

const list = async ({ page = 1, limit = 12, search, category, type, sort = 'created_desc', includeInactive = false }) => {
  const where = [];
  const params = [];

  if (!includeInactive) where.push('p.active = 1');
  if (search) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (type) {
    where.push('p.type = ?');
    params.push(type);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORT_COLUMNS[sort] || SORT_COLUMNS.created_desc;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereSql}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  return { items: rows.map(mapProduct), total };
};

const findByIdOrSlug = async (idOrSlug, { includeInactive = false } = {}) => {
  const byId = /^\d+$/.test(idOrSlug);
  const filter = byId ? 'p.id = ?' : 'p.slug = ?';
  const value = byId ? Number(idOrSlug) : idOrSlug;
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${filter} ${includeInactive ? '' : 'AND p.active = 1'}
      LIMIT 1`,
    [value]
  );
  return rows[0] ? mapProduct(rows[0]) : null;
};

const create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO products (sku, name, slug, description, type, price, cost, min_stock, category_id, image_url, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.sku,
      data.name,
      data.slug,
      data.description ?? null,
      data.type,
      data.price,
      data.cost ?? null,
      data.type === 'PHYSICAL' ? (data.minStock ?? 0) : 0,
      data.categoryId ?? null,
      data.imageUrl ?? null,
      data.active ? 1 : 0,
    ]
  );
  return result.insertId;
};

const update = async (id, data) => {
  const columnMap = {
    sku: 'sku',
    name: 'name',
    slug: 'slug',
    description: 'description',
    type: 'type',
    price: 'price',
    cost: 'cost',
    minStock: 'min_stock',
    categoryId: 'category_id',
    imageUrl: 'image_url',
    active: 'active',
  };
  const fields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    const column = columnMap[key];
    if (!column) continue;
    fields.push(`${column} = ?`);
    params.push(column === 'active' ? (value ? 1 : 0) : (value ?? null));
  }
  if (!fields.length) return 0;
  params.push(id);
  const [result] = await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
};

const categoryExists = async (id) => {
  const [rows] = await pool.query('SELECT 1 FROM categories WHERE id = ? LIMIT 1', [id]);
  return rows.length > 0;
};

module.exports = { list, findByIdOrSlug, create, update, categoryExists };
