const { ApiError } = require('../../middlewares/errorHandler.cjs');
const { slugify } = require('../../utils/slugify.cjs');
const repo = require('./products.repository.cjs');

const getPaginationMeta = (total, page, limit) => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});

const list = async (query) => {
  const { items, total } = await repo.list(query);
  return { items, meta: getPaginationMeta(total, query.page, query.limit) };
};

const getOne = async (idOrSlug) => {
  const product = await repo.findByIdOrSlug(idOrSlug);
  if (!product) throw new ApiError(404, 'Producto no encontrado', 'NOT_FOUND');
  return product;
};

// Traduce errores de unicidad (ER_DUP_ENTRY) a mensajes entendibles.
const mapDupError = (error) => {
  if (error && error.code === 'ER_DUP_ENTRY') {
    if (/for key 'products\.sku'/.test(error.message)) {
      return new ApiError(409, 'Ya existe un producto con ese SKU', 'CONFLICT');
    }
    if (/for key 'products\.slug'/.test(error.message)) {
      return new ApiError(409, 'Ya existe un producto con ese slug', 'CONFLICT');
    }
    return new ApiError(409, 'Ya existe un registro con esos datos únicos', 'CONFLICT');
  }
  return error;
};

const create = async (data) => {
  if (data.slug === undefined) {
    data.slug = slugify(data.name);
    if (!data.slug) throw new ApiError(400, 'No se pudo generar un slug válido para el nombre', 'VALIDATION_ERROR');
  }
  if (data.categoryId && !(await repo.categoryExists(data.categoryId))) {
    throw new ApiError(400, 'La categoría indicada no existe', 'VALIDATION_ERROR');
  }
  try {
    const id = await repo.create(data);
    return repo.findByIdOrSlug(id, { includeInactive: true });
  } catch (error) {
    throw mapDupError(error);
  }
};

const update = async (id, data) => {
  const current = await repo.findByIdOrSlug(id, { includeInactive: true });
  if (!current) throw new ApiError(404, 'Producto no encontrado', 'NOT_FOUND');

  if (data.slug && data.slug !== current.slug) {
    // Unicidad de slug la valida el índice UNIQUE; se anticipa para dar un mensaje claro.
    const existing = await repo.findByIdOrSlug(data.slug, { includeInactive: true });
    if (existing && existing.id !== current.id) {
      throw new ApiError(409, 'Ya existe un producto con ese slug', 'CONFLICT');
    }
  }
  if (data.categoryId && !(await repo.categoryExists(data.categoryId))) {
    throw new ApiError(400, 'La categoría indicada no existe', 'VALIDATION_ERROR');
  }

  try {
    await repo.update(current.id, data);
    return repo.findByIdOrSlug(current.id, { includeInactive: true });
  } catch (error) {
    throw mapDupError(error);
  }
};

module.exports = { list, getOne, create, update };
