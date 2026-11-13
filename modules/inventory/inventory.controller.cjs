const { ok } = require('../../middlewares/errorHandler.cjs');
const { logAction } = require('../../utils/audit.cjs');
const repo = require('./inventory.repository.cjs');
const service = require('./inventory.service.cjs');

// GET /api/v1/inventory/warehouses — ADMIN/WAREHOUSE (datos internos)
const listWarehouses = async (req, res, next) => {
  try {
    const warehouses = await repo.listWarehouses();
    return ok(res, warehouses, { count: warehouses.length });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/inventory/balances — ADMIN/WAREHOUSE (saldo físico por producto/bodega)
const listBalances = async (req, res, next) => {
  try {
    const { items, meta } = await service.listBalances(req.validated.query);
    return ok(res, items, meta);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/inventory/movements — ADMIN/WAREHOUSE (kardex paginado)
const listMovements = async (req, res, next) => {
  try {
    const { items, meta } = await service.listMovements(req.validated.query);
    return ok(res, items, meta);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/inventory/movements — ADMIN/WAREHOUSE
const createMovement = async (req, res, next) => {
  try {
    const result = await service.registerMovement(req.body, req.user.id);
    await logAction(req.user.id, 'INVENTORY_MOVEMENT', 'inventory_movement', result.movementId, {
      productId: result.productId,
      warehouseId: result.warehouseId,
      type: result.type,
      quantity: result.quantity,
      balanceAfter: result.balanceAfter,
    });
    return ok(res, result, undefined, 201);
  } catch (error) {
    return next(error);
  }
};

module.exports = { listWarehouses, listBalances, listMovements, createMovement };
