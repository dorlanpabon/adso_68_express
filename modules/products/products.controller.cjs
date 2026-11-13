const { ok } = require('../../middlewares/errorHandler.cjs');
const { logAction } = require('../../utils/audit.cjs');
const service = require('./products.service.cjs');

// GET /api/v1/products — pública: solo activos, paginada y filtrada
const list = async (req, res, next) => {
  try {
    const { items, meta } = await service.list(req.validated.query);
    return ok(res, items, meta);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/products/admin — ADMIN: incluye inactivos para gestión
const listAdmin = async (req, res, next) => {
  try {
    const { items, meta } = await service.list({ ...req.validated.query, includeInactive: true });
    return ok(res, items, meta);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/products/:idOrSlug — pública
const getOne = async (req, res, next) => {
  try {
    const product = await service.getOne(req.params.idOrSlug);
    return ok(res, product);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/products — ADMIN
const create = async (req, res, next) => {
  try {
    const product = await service.create(req.body);
    await logAction(req.user.id, 'PRODUCT_CREATE', 'product', product.id, { sku: product.sku });
    return ok(res, product, undefined, 201);
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/products/:id — ADMIN (edición parcial; desactivar = active:false)
const update = async (req, res, next) => {
  try {
    const product = await service.update(Number(req.params.id), req.body);
    await logAction(req.user.id, 'PRODUCT_UPDATE', 'product', product.id, { fields: Object.keys(req.body) });
    return ok(res, product);
  } catch (error) {
    return next(error);
  }
};

module.exports = { list, listAdmin, getOne, create, update };
