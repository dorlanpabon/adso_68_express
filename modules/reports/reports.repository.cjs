// Reportes agregados para el dashboard. TODO el cálculo es server-side con
// SQL sobre DECIMAL; los pedidos CANCELLED se excluyen de la facturación.

const pool = require('../../utils/db.cjs');

const summary = async () => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS orders_total,
       COALESCE(SUM(status != 'CANCELLED'), 0) AS orders_active,
       COALESCE(SUM(status = 'CANCELLED'), 0) AS orders_cancelled,
       COALESCE(SUM(status = 'PENDING_PAYMENT'), 0) AS orders_pending_payment,
       COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total END), 0) AS revenue_total,
       COALESCE(SUM(CASE WHEN status != 'CANCELLED'
                          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                         THEN total END), 0) AS revenue_30d
       FROM orders`
  );
  const r = rows[0];
  return {
    ordersTotal: Number(r.orders_total),
    ordersActive: Number(r.orders_active),
    ordersCancelled: Number(r.orders_cancelled),
    ordersPendingPayment: Number(r.orders_pending_payment),
    revenueTotal: Number(r.revenue_total),
    revenue30d: Number(r.revenue_30d),
  };
};

// Serie diaria de los últimos 30 días (para la gráfica del dashboard).
// Los días sin ventas NO se rellenan en SQL: el frontend muestra los huecos.
const salesByDay = async ({ days = 30 } = {}) => {
  const safeDays = Number.isInteger(days) && days >= 1 && days <= 90 ? days : 30;
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS day,
            COUNT(*) AS orders,
            COALESCE(SUM(total), 0) AS revenue
       FROM orders
      WHERE status != 'CANCELLED'
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC`,
    [safeDays]
  );
  return rows.map((row) => ({
    day: row.day,
    orders: Number(row.orders),
    revenue: Number(row.revenue),
  }));
};

const topProducts = async ({ limit = 5 } = {}) => {
  const safeLimit = Number.isInteger(limit) && limit >= 1 && limit <= 20 ? limit : 5;
  const [rows] = await pool.query(
    `SELECT oi.product_id, oi.sku_snapshot AS sku, oi.name_snapshot AS name,
            SUM(oi.quantity) AS units_sold,
            SUM(oi.line_total) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'CANCELLED'
      GROUP BY oi.product_id, oi.sku_snapshot, oi.name_snapshot
      ORDER BY revenue DESC
      LIMIT ?`,
    [safeLimit]
  );
  return rows.map((row) => ({
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    unitsSold: Number(row.units_sold),
    revenue: Number(row.revenue),
  }));
};

const recentOrders = async ({ limit = 10 } = {}) => {
  const safeLimit = Number.isInteger(limit) && limit >= 1 && limit <= 50 ? limit : 10;
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.total, o.created_at,
            c.name AS customer_name, c.email AS customer_email,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ?`,
    [safeLimit]
  );
  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    total: Number(row.total),
    createdAt: row.created_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    itemCount: Number(row.item_count),
  }));
};

module.exports = { summary, salesByDay, topProducts, recentOrders };
