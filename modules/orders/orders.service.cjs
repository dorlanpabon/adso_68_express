const { ApiError } = require('../../middlewares/errorHandler.cjs');
const pool = require('../../utils/db.cjs');
const inventoryRepo = require('../inventory/inventory.repository.cjs');
const repo = require('./orders.repository.cjs');

const DEFAULT_IDEMPOTENCY_TTL_HINT = 'Si el cliente reenvía la misma clave se devuelve el pedido original';

// ORD-<base36 epoch>-<4 al azar>: único y ≤ 30 chars (límite de la columna).
const generarNumeroPedido = () =>
  `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Redondeo a 2 decimales para columnas DECIMAL(12,2).
const money = (value) => Number(Number(value).toFixed(2));

const isDupEntry = (error) => error && error.code === 'ER_DUP_ENTRY';

const mergeItems = (items) => {
  const merged = new Map();
  for (const { productId, quantity } of items) {
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
};

// Cliente del pedido: usa la fila vinculada al usuario o crea/actualiza una
// con los datos de contacto del checkout.
const resolveCustomer = async (conn, userId, customerData) => {
  const existing = await repo.findCustomerByUserId(conn, userId);
  if (existing) {
    // El nombre/correo del checkout actualizan la ficha si difieren.
    await repo.updateCustomerContact(conn, existing.id, {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone ?? null,
    });
    return { id: existing.id, created: false };
  }

  const byEmail = await repo.findCustomerByEmail(conn, customerData.email);
  if (byEmail) {
    if (byEmail.user_id && byEmail.user_id !== userId) {
      throw new ApiError(409, 'Ese correo ya está asociado a otro cliente', 'CONFLICT');
    }
    // Ficha huérfana o compartible: se vincula y actualiza el contacto.
    await conn.query('UPDATE customers SET user_id = ? WHERE id = ?', [userId, byEmail.id]);
    await repo.updateCustomerContact(conn, byEmail.id, {
      name: customerData.name,
      email: null,
      phone: customerData.phone ?? null,
    });
    return { id: byEmail.id, created: false };
  }

  return { id: (await repo.createCustomer(conn, { userId, ...customerData })).id, created: true };
};

const checkout = async (data, actorUserId) => {
  const items = mergeItems(data.items);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bodega de despacho: la indicada o la primera activa (MVP: sin
    // asignación multi-bodega; documentado como limitación).
    let warehouseId = data.warehouseId;
    if (warehouseId) {
      if (!(await inventoryRepo.warehouseExists(warehouseId))) {
        throw new ApiError(404, 'Bodega no encontrada o inactiva', 'NOT_FOUND');
      }
    } else {
      const warehouses = await inventoryRepo.listWarehouses();
      if (warehouses.length === 0) {
        throw new ApiError(422, 'No hay bodegas activas para despachar', 'BUSINESS_RULE');
      }
      warehouseId = warehouses[0].id;
    }

    // Validar productos y descontar inventario de los físicos.
    const validated = [];
    let subtotal = 0;

    for (const { productId, quantity } of items) {
      const product = await repo.lockProductForOrder(conn, productId);
      if (!product) throw new ApiError(404, `Producto ${productId} no encontrado`, 'NOT_FOUND');
      if (!product.active) {
        throw new ApiError(400, `El producto "${product.name}" ya no está disponible`, 'PRODUCT_INACTIVE');
      }
      if (product.price === null) {
        throw new ApiError(422, `El producto "${product.name}" no tiene precio configurado`, 'BUSINESS_RULE');
      }

      let inventory = null;
      if (product.type === 'PHYSICAL') {
        // Los DIGITAL no descuentan inventario físico (decisión del plan).
        const balance = await inventoryRepo.lockBalance(conn, productId, warehouseId, { create: false });
        const available = balance ? balance.quantity : 0;
        if (available < quantity) {
          throw new ApiError(
            422,
            `Stock insuficiente de "${product.name}": disponible ${available}, solicitado ${quantity}`,
            'INSUFFICIENT_STOCK'
          );
        }
        inventory = { warehouseId, quantity };
      }

      const lineTotal = money(product.price * quantity);
      subtotal = money(subtotal + lineTotal);
      validated.push({ product, quantity, lineTotal, inventory });
    }

    const customer = await resolveCustomer(conn, actorUserId, data.customer);

    // Insertar pedido. La clave de idempotencia es UNIQUE: un reenvío
    // concurrente choca aquí y se resuelve como repetición del pedido original.
    let orderId;
    let orderNumber;
    try {
      orderNumber = generarNumeroPedido();
      orderId = await repo.insertOrder(conn, {
        orderNumber,
        customerId: customer.id,
        subtotal,
        total: subtotal,
        idempotencyKey: data.idempotencyKey || null,
      });
    } catch (error) {
      if (isDupEntry(error) && data.idempotencyKey) {
        throw { replay: true };
      }
      if (isDupEntry(error)) {
        // Colisión improbable de número de pedido: reintenta una vez.
        orderNumber = generarNumeroPedido();
        orderId = await repo.insertOrder(conn, {
          orderNumber,
          customerId: customer.id,
          subtotal,
          total: subtotal,
          idempotencyKey: data.idempotencyKey || null,
        });
      } else {
        throw error;
      }
    }

    for (const { product, quantity, lineTotal, inventory } of validated) {
      await repo.insertOrderItem(conn, {
        orderId,
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unitPrice: product.price,
        quantity,
        lineTotal,
      });

      if (inventory) {
        const newQuantity = (await inventoryRepo.lockBalance(conn, product.id, inventory.warehouseId)).quantity - quantity;
        await inventoryRepo.updateBalance(conn, product.id, inventory.warehouseId, newQuantity);
        await inventoryRepo.insertMovement(conn, {
          productId: product.id,
          warehouseId: inventory.warehouseId,
          type: 'OUT',
          quantity,
          balanceAfter: newQuantity,
          reason: `Venta — pedido ${orderNumber}`,
          referenceType: 'ORDER',
          referenceId: orderId,
          actorUserId,
        });
      }
    }

    await conn.commit();
    const order = await repo.findOrderById(orderId);
    const orderItems = await repo.getOrderItems(orderId);
    return { order, items: orderItems, idempotentReplay: false };
  } catch (error) {
    await conn.rollback();

    // Repetición idempotente: el pedido con esa clave ya existe.
    if (error && error.replay) {
      const existing = await repo.findOrderByIdempotencyKey(data.idempotencyKey);
      if (existing) {
        const replayItems = await repo.getOrderItems(existing.id);
        return { order: existing, items: replayItems, idempotentReplay: true, hint: DEFAULT_IDEMPOTENCY_TTL_HINT };
      }
      throw new ApiError(409, 'Conflicto de idempotencia: no se pudo recuperar el pedido original', 'CONFLICT');
    }

    throw error;
  } finally {
    conn.release();
  }
};

const getDetail = async (orderId, actor) => {
  const raw = await repo.findOrderForActor(orderId);
  if (!raw) throw new ApiError(404, 'Pedido no encontrado', 'NOT_FOUND');

  const isOwner = raw.owner_user_id === actor.id;
  const isAdmin = actor.roleCode === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'No tienes acceso a este pedido', 'FORBIDDEN');
  }

  const order = await repo.findOrderById(orderId);
  const items = await repo.getOrderItems(orderId);
  return { order, items };
};

const listMine = async (query, userId) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const customer = await repo.findCustomerByUserId(pool, userId);
  if (!customer) {
    return { items: [], meta: { page, limit, total: 0, totalPages: 1 } };
  }
  const { items, total } = await repo.listOrdersByCustomer({ customerId: customer.id, page, limit });
  return { items, meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } };
};

// Cancelar: propietario o ADMIN; solo pedidos aún no pagados/despachados.
// Restituye el stock de los ítems físicos con movimientos IN (referencia CANCEL).
const cancel = async (orderId, actor) => {
  const raw = await repo.findOrderForActor(orderId);
  if (!raw) throw new ApiError(404, 'Pedido no encontrado', 'NOT_FOUND');

  const isOwner = raw.owner_user_id === actor.id;
  const isAdmin = actor.roleCode === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'No tienes acceso a este pedido', 'FORBIDDEN');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const order = await repo.lockOrderForUpdate(conn, orderId);
    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(order.status)) {
      throw new ApiError(
        409,
        `El pedido está en estado ${order.status}: ya no se puede cancelar`,
        'BUSINESS_RULE'
      );
    }
    if (order.payment_status === 'PAID') {
      throw new ApiError(409, 'El pedido ya está pagado: usa reembolso', 'BUSINESS_RULE');
    }

    // Restituir inventario por cada salida registrada del pedido.
    const outs = await repo.findOutMovementsByOrder(conn, orderId);
    for (const out of outs) {
      const balance = await inventoryRepo.lockBalance(conn, out.productId, out.warehouseId, { create: false });
      const newQuantity = (balance ? balance.quantity : 0) + out.quantity;
      await inventoryRepo.updateBalance(conn, out.productId, out.warehouseId, newQuantity);
      await inventoryRepo.insertMovement(conn, {
        productId: out.productId,
        warehouseId: out.warehouseId,
        type: 'IN',
        quantity: out.quantity,
        balanceAfter: newQuantity,
        reason: `Cancelación del pedido ${raw.order_number}`,
        referenceType: 'CANCEL',
        referenceId: orderId,
        actorUserId: actor.id,
      });
    }

    await repo.updateOrderStatus(conn, orderId, 'CANCELLED');
    await conn.commit();

    const updated = await repo.findOrderById(orderId);
    return { order: updated, restockedItems: outs.length };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = { checkout, getDetail, listMine, cancel };
