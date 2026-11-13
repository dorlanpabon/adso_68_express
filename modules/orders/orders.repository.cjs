// Acceso a datos de pedidos. Las funciones que reciben `conn` DEBEN ejecutarse
// dentro de la transacción del service (checkout/cancelar son atómicos).

const pool = require('../../utils/db.cjs');

const mapOrder = (row) => ({
  id: row.id,
  orderNumber: row.order_number,
  customerId: row.customer_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  status: row.status,
  paymentStatus: row.payment_status,
  subtotal: row.subtotal === null ? null : Number(row.subtotal),
  total: row.total === null ? null : Number(row.total),
  idempotencyKey: row.idempotency_key || null,
  createdAt: row.created_at,
});

const mapItem = (row) => ({
  id: row.id,
  productId: row.product_id,
  sku: row.sku_snapshot,
  name: row.name_snapshot,
  unitPrice: row.unit_price === null ? null : Number(row.unit_price),
  quantity: row.quantity === null ? null : Number(row.quantity),
  lineTotal: row.line_total === null ? null : Number(row.line_total),
  productType: row.product_type,
});

const DEFAULT_COLUMNS = `
  o.*, c.name AS customer_name, c.email AS customer_email`;

// --- Clientes ---

const findCustomerByUserId = async (conn, userId) => {
  const [rows] = await (conn || pool).query(
    'SELECT id, user_id, name, email, phone FROM customers WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
};

const findCustomerByEmail = async (conn, email) => {
  const [rows] = await (conn || pool).query(
    'SELECT id, user_id, name, email FROM customers WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

const createCustomer = async (conn, { userId = null, name, email, phone = null }) => {
  const [result] = await (conn || pool).query(
    'INSERT INTO customers (user_id, name, email, phone) VALUES (?, ?, ?, ?)',
    [userId, name, email, phone]
  );
  return { id: result.insertId, name, email };
};

const updateCustomerContact = async (conn, id, { name, email, phone }) => {
  await (conn || pool).query(
    'UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?',
    [name ?? null, email ?? null, phone ?? null, id]
  );
};

// --- Productos para el pedido (con lock: el precio no cambia a mitad de la txn) ---

const lockProductForOrder = async (conn, productId) => {
  const [rows] = await conn.query(
    'SELECT id, sku, name, type, price, active FROM products WHERE id = ? FOR UPDATE',
    [productId]
  );
  return rows[0]
    ? {
        id: rows[0].id,
        sku: rows[0].sku,
        name: rows[0].name,
        type: rows[0].type,
        price: rows[0].price === null ? null : Number(rows[0].price),
        active: rows[0].active === 1,
      }
    : null;
};

// --- Pedidos ---

const insertOrder = async (conn, { orderNumber, customerId, subtotal, total, idempotencyKey = null }) => {
  const [result] = await conn.query(
    `INSERT INTO orders (order_number, customer_id, status, payment_status, subtotal, total, idempotency_key)
     VALUES (?, ?, 'PENDING_PAYMENT', 'PENDING', ?, ?, ?)`,
    [orderNumber, customerId, subtotal, total, idempotencyKey]
  );
  return result.insertId;
};

const insertOrderItem = async (conn, { orderId, productId, sku, name, unitPrice, quantity, lineTotal }) => {
  const [result] = await conn.query(
    `INSERT INTO order_items (order_id, product_id, sku_snapshot, name_snapshot, unit_price, quantity, line_total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [orderId, productId, sku, name, unitPrice, quantity, lineTotal]
  );
  return result.insertId;
};

const findOrderById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${DEFAULT_COLUMNS}
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
};

const findOrderByIdempotencyKey = async (key) => {
  const [rows] = await pool.query(
    `SELECT ${DEFAULT_COLUMNS}
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
      WHERE o.idempotency_key = ?
      LIMIT 1`,
    [key]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
};

const getOrderItems = async (orderId) => {
  const [rows] = await pool.query(
    `SELECT oi.*, p.type AS product_type
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC`,
    [orderId]
  );
  return rows.map(mapItem);
};

const listOrdersByCustomer = async ({ customerId, page = 1, limit = 10 }) => {
  const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?', [customerId]);
  const total = Number(countRows[0].total);

  const [rows] = await pool.query(
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ? OFFSET ?`,
    [customerId, limit, (page - 1) * limit]
  );
  return {
    items: rows.map((row) => ({ ...mapOrder(row), itemCount: Number(row.item_count) })),
    total,
  };
};

const findOrderForActor = async (id) => {
  // Devuelve la orden con el user_id del cliente para validar propiedad.
  const [rows] = await pool.query(
    `SELECT o.*, c.user_id AS owner_user_id
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const lockOrderForUpdate = async (conn, id) => {
  const [rows] = await conn.query('SELECT id, status, payment_status FROM orders WHERE id = ? FOR UPDATE', [id]);
  return rows[0] || null;
};

const updateOrderStatus = async (conn, id, status) => {
  await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
};

// Movimientos OUT generados por un pedido (para restituir stock al cancelar).
const findOutMovementsByOrder = async (conn, orderId) => {
  const [rows] = await (conn || pool).query(
    `SELECT id, product_id, warehouse_id, quantity, balance_after
       FROM inventory_movements
      WHERE reference_type = 'ORDER' AND reference_id = ? AND type = 'OUT'
      ORDER BY id ASC`,
    [orderId]
  );
  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    warehouseId: row.warehouse_id,
    quantity: Number(row.quantity),
  }));
};

module.exports = {
  findCustomerByUserId,
  findCustomerByEmail,
  createCustomer,
  updateCustomerContact,
  lockProductForOrder,
  insertOrder,
  insertOrderItem,
  findOrderById,
  findOrderByIdempotencyKey,
  getOrderItems,
  listOrdersByCustomer,
  findOrderForActor,
  lockOrderForUpdate,
  updateOrderStatus,
  findOutMovementsByOrder,
};
