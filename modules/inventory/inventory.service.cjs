const { ApiError } = require('../../middlewares/errorHandler.cjs');
const pool = require('../../utils/db.cjs');
const repo = require('./inventory.repository.cjs');

// IN      → suma cantidad al saldo
// OUT     → resta; rechaza si dejaría el saldo negativo
// ADJUST  → fija el saldo en el valor absoluto indicado (correcciones/conteo)
const registerMovement = async (data, actorUserId) => {
  const product = await repo.productForInventory(pool, data.productId);
  if (!product) throw new ApiError(404, 'Producto no encontrado', 'NOT_FOUND');
  if (product.type === 'DIGITAL') {
    throw new ApiError(
      400,
      'Los productos digitales no manejan inventario físico',
      'VALIDATION_ERROR'
    );
  }
  if (data.type !== 'ADJUST' && data.quantity <= 0) {
    throw new ApiError(400, 'La cantidad debe ser mayor a 0 para movimientos IN/OUT', 'VALIDATION_ERROR');
  }
  if (!(await repo.warehouseExists(data.warehouseId))) {
    throw new ApiError(404, 'Bodega no encontrada o inactiva', 'NOT_FOUND');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Solo IN crea saldo desde cero; OUT/ADJUST sobre saldo inexistente = sin stock.
    const balance = await repo.lockBalance(conn, data.productId, data.warehouseId, {
      create: data.type === 'IN',
    });
    const current = balance ? balance.quantity : 0;

    let newQuantity;
    if (data.type === 'IN') {
      newQuantity = current + data.quantity;
    } else if (data.type === 'OUT') {
      newQuantity = current - data.quantity;
      if (newQuantity < 0) {
        throw new ApiError(
          422,
          `Stock insuficiente en bodega: disponible ${current}, solicitado ${data.quantity}`,
          'INSUFFICIENT_STOCK'
        );
      }
    } else {
      newQuantity = data.quantity;
    }

    await repo.updateBalance(conn, data.productId, data.warehouseId, newQuantity);
    const movementId = await repo.insertMovement(conn, {
      productId: data.productId,
      warehouseId: data.warehouseId,
      type: data.type,
      quantity: data.quantity,
      balanceAfter: newQuantity,
      reason: data.reason || null,
      actorUserId,
    });

    await conn.commit();

    return {
      movementId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      type: data.type,
      quantity: data.quantity,
      balanceBefore: current,
      balanceAfter: newQuantity,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const listBalances = async (query) => {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const { items, total } = await repo.listBalances({
    warehouseId: query.warehouseId,
    productId: query.productId,
    lowStock: query.lowStock === true || query.lowStock === '1' || query.lowStock === 'true',
    page,
    limit,
  });
  return { items, meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } };
};

const listMovements = async (query) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const { items, total } = await repo.listMovements({
    productId: query.productId,
    warehouseId: query.warehouseId,
    type: query.type,
    page,
    limit,
  });
  return { items, meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } };
};

module.exports = { registerMovement, listBalances, listMovements };
