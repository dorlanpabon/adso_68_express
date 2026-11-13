const { ok } = require('../../middlewares/errorHandler.cjs');
const { logAction } = require('../../utils/audit.cjs');
const service = require('./orders.service.cjs');

// POST /api/v1/orders/checkout — cualquier usuario autenticado compra.
const checkout = async (req, res, next) => {
  try {
    const result = await service.checkout(req.body, req.user.id);
    // Repetición idempotente devuelve 200 con el pedido original; alta nueva, 201.
    if (result.idempotentReplay) {
      await logAction(req.user.id, 'ORDER_CHECKOUT_REPLAY', 'order', result.order.id, {
        orderNumber: result.order.orderNumber,
      });
      return ok(res, result);
    }
    await logAction(req.user.id, 'ORDER_CHECKOUT', 'order', result.order.id, {
      orderNumber: result.order.orderNumber,
      total: result.order.total,
    });
    return ok(res, result, undefined, 201);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/orders/mine — pedidos del usuario autenticado.
const listMine = async (req, res, next) => {
  try {
    const { items, meta } = await service.listMine(req.validated.query, req.user.id);
    return ok(res, items, meta);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/orders/:id — propietario o ADMIN.
const getDetail = async (req, res, next) => {
  try {
    const detail = await service.getDetail(Number(req.params.id), {
      id: req.user.id,
      roleCode: req.roleCode,
    });
    return ok(res, detail);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/orders/:id/cancel — propietario o ADMIN (restaura stock).
const cancel = async (req, res, next) => {
  try {
    const result = await service.cancel(Number(req.params.id), {
      id: req.user.id,
      roleCode: req.roleCode,
    });
    await logAction(req.user.id, 'ORDER_CANCEL', 'order', result.order.id, {
      orderNumber: result.order.orderNumber,
      restockedItems: result.restockedItems,
    });
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
};

module.exports = { checkout, listMine, getDetail, cancel };
