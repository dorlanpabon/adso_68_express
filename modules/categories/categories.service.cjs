const { ApiError } = require('../../middlewares/errorHandler.cjs');
const { slugify } = require('../../utils/slugify.cjs');
const repo = require('./categories.repository.cjs');

const list = ({ includeInactive = false } = {}) => repo.list({ includeInactive });

const create = async (data) => {
  const slug = data.slug || slugify(data.name);
  if (!slug) throw new ApiError(400, 'No se pudo generar un slug válido para el nombre', 'VALIDATION_ERROR');

  const existing = await repo.findBySlug(slug);
  if (existing) throw new ApiError(409, `Ya existe una categoría con el slug "${slug}"`, 'CONFLICT');

  const id = await repo.create({ ...data, slug });
  return { id, name: data.name, slug };
};

const update = async (id, data) => {
  const current = await repo.findById(id);
  if (!current) throw new ApiError(404, 'Categoría no encontrada', 'NOT_FOUND');

  if (data.slug && data.slug !== current.slug) {
    const existing = await repo.findBySlug(data.slug);
    if (existing) throw new ApiError(409, `Ya existe una categoría con el slug "${data.slug}"`, 'CONFLICT');
  }

  await repo.update(id, data);
  return repo.findById(id);
};

module.exports = { list, create, update };
