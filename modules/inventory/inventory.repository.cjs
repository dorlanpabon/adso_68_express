// Acceso a datos de inventario. Las escrituras de saldo SIEMPRE ocurren
// dentro de la transacción que abre el service, con lock de fila
// (SELECT ... FOR UPDATE) para serializar movimientos concurrentes.

const pool = require('../../utils/db.cjs');

const mapBalance = (row) => ({
  productId: row.product_id,
  productSku: row.sku,
  productName: row.product_name,
  productType: row.product_type,
  productActive: row.product_active === 1,
  warehouseId: row.warehouse_id,
  warehouseCode: row.warehouse_code,
  warehouseName: row.warehouse_name,
  quantity: row.quantity === null ? null : Number(row.quantity),
  reservedQuantity: row.reserved_quantity === null ? null : Number(row.reserved_quantity),
  minStock: row.min_stock === null ? null : Number(row.min_stock),
});

const mapMovement = (row) => ({
  id: row.id,
  productId: row.product_id,
  productSku: row.sku,
  productName: row.product_name,
  warehouseId: row.warehouse_id,
  warehouseCode: row.warehouse_code,
  type: row.type,
  quantity: row.quantity === null ? null : Number(row.quantity),
  balanceAfter: row.balance_after === null ? null : Number(row.balance_after),
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  reason: row.reason,
  actorUserId: row.actor_user_id,
  actorUsuario: row.actor_usuario,
  createdAt: row.created_at,
});

const listWarehouses = async ({ includeInactive = false } = {}) => {
  const [rows] = await pool.query(
    `SELECT id, name, code, location, active
       FROM warehouses
      ${includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY code ASC`
  );
  return rows.map((w) => ({ ...w, active: w.active === 1 }));
};

const warehouseExists = async (id) => {
  const [rows] = await pool.query('SELECT 1 FROM warehouses WHERE id = ? AND active = 1 LIMIT 1', [id]);
  return rows.length > 0;
};

const productForInventory = async (conn, productId) => {
  const [rows] = await (conn || pool).query(
    'SELECT id, sku, name, type, active FROM products WHERE id = ? LIMIT 1',
    [productId]
  );
  return rows[0] || null;
};

// Bloquea (o crea) la fila de saldo y la devuelve bloqueada hasta el commit.
// Si no existe y create=true, la inserta en 0 y la vuelve a leer con lock.
const lockBalance = async (conn, productId, warehouseId, { create = false } = {}) => {
  let [rows] = await conn.query(
    'SELECT quantity, reserved_quantity FROM inventory_balances WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
    [productId, warehouseId]
  );
  if (rows.length === 0 && create) {
    await conn.query(
      'INSERT INTO inventory_balances (product_id, warehouse_id, quantity, reserved_quantity) VALUES (?, ?, 0, 0)',
      [productId, warehouseId]
    );
    [rows] = await conn.query(
      'SELECT quantity, reserved_quantity FROM inventory_balances WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
      [productId, warehouseId]
    );
  }
  return rows[0]
    ? {
        quantity: Number(rows[0].quantity),
        reservedQuantity: Number(rows[0].reserved_quantity),
      }
    : null;
};

const insertMovement = async (conn, { productId, warehouseId, type, quantity, balanceAfter, reason = null, referenceType = null, referenceId = null, actorUserId = null }) => {
  const [result] = await conn.query(
    `INSERT INTO inventory_movements
       (product_id, warehouse_id, type, quantity, balance_after, reference_type, reference_id, reason, actor_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [productId, warehouseId, type, quantity, balanceAfter, referenceType, referenceId, reason, actorUserId]
  );
  return result.insertId;
};

const updateBalance = async (conn, productId, warehouseId, quantity) => {
  await conn.query(
    'UPDATE inventory_balances SET quantity = ? WHERE product_id = ? AND warehouse_id = ?',
    [quantity, productId, warehouseId]
  );
};

const listBalances = async ({ warehouseId, productId, lowStock = false, page = 1, limit = 50 }) => {
  const where = [];
  const params = [];
  // El inventario físico aplica solo a productos PHYSICAL: los DIGITAL no
  // descuentan existencias (decisión del plan).
  where.push('p.type = "PHYSICAL"');
  if (warehouseId) {
    where.push('b.warehouse_id = ?');
    params.push(warehouseId);
  }
  if (productId) {
    where.push('b.product_id = ?');
    params.push(productId);
  }
  if (lowStock) {
    where.push('b.quantity <= p.min_stock');
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM inventory_balances b
       JOIN products p ON p.id = b.product_id
       JOIN warehouses w ON w.id = b.warehouse_id
       ${whereSql}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await pool.query(
    `SELECT b.product_id, b.warehouse_id, b.quantity, b.reserved_quantity,
            p.sku, p.name AS product_name, p.type AS product_type, p.active AS product_active, p.min_stock,
            w.code AS warehouse_code, w.name AS warehouse_name
       FROM inventory_balances b
       JOIN products p ON p.id = b.product_id
       JOIN warehouses w ON w.id = b.warehouse_id
       ${whereSql}
       ORDER BY p.name ASC, w.code ASC
       LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  return { items: rows.map(mapBalance), total };
};

const listMovements = async ({ page = 1, limit = 20, productId, warehouseId, type }) => {
  const where = [];
  const params = [];
  if (productId) {
    where.push('m.product_id = ?');
    params.push(productId);
  }
  if (warehouseId) {
    where.push('m.warehouse_id = ?');
    params.push(warehouseId);
  }
  if (type) {
    where.push('m.type = ?');
    params.push(type);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM inventory_movements m
       ${whereSql}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await pool.query(
    `SELECT m.*, p.sku, p.name AS product_name,
            w.code AS warehouse_code, u.usuario AS actor_usuario
       FROM inventory_movements m
       JOIN products p ON p.id = m.product_id
       JOIN warehouses w ON w.id = m.warehouse_id
       LEFT JOIN usuarios u ON u.id = m.actor_user_id
       ${whereSql}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  return { items: rows.map(mapMovement), total };
};

module.exports = {
  listWarehouses,
  warehouseExists,
  productForInventory,
  lockBalance,
  insertMovement,
  updateBalance,
  listBalances,
  listMovements,
};
