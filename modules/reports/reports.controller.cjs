const { ok } = require('../../middlewares/errorHandler.cjs');
const repo = require('./reports.repository.cjs');
const inventoryRepo = require('../inventory/inventory.repository.cjs');

// GET /api/v1/reports/dashboard — ADMIN: resumen de ventas, serie diaria,
// top productos, pedidos recientes y alertas de stock bajo en una sola llamada.
const dashboard = async (req, res, next) => {
  try {
    const q = req.validated.query;

    const [summary, salesByDay, topProducts, recentOrders, lowStock] = await Promise.all([
      repo.summary(),
      repo.salesByDay({ days: q.days }),
      repo.topProducts({ limit: q.topLimit }),
      repo.recentOrders({ limit: q.recentLimit }),
      inventoryRepo.listBalances({ lowStock: true, page: 1, limit: 20 }),
    ]);

    return ok(
      res,
      { summary, salesByDay, topProducts, recentOrders, lowStock: lowStock.items },
      { generatedAt: new Date().toISOString(), lowStockCount: lowStock.meta.total }
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = { dashboard };
