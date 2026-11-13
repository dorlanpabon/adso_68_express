const { ok } = require('../../middlewares/errorHandler.cjs');
const { logAction } = require('../../utils/audit.cjs');
const service = require('./categories.service.cjs');

// GET /api/v1/categories — pública (solo activas)
const list = async (req, res, next) => {
  try {
    const categories = await service.list();
    return ok(res, categories, { count: categories.length });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/categories — ADMIN
const create = async (req, res, next) => {
  try {
    const category = await service.create(req.body);
    await logAction(req.user.id, 'CATEGORY_CREATE', 'category', category.id, { name: category.name });
    return ok(res, category, undefined, 201);
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/categories/:id — ADMIN
const update = async (req, res, next) => {
  try {
    const category = await service.update(Number(req.params.id), req.body);
    await logAction(req.user.id, 'CATEGORY_UPDATE', 'category', category.id);
    return ok(res, category);
  } catch (error) {
    return next(error);
  }
};

module.exports = { list, create, update };
