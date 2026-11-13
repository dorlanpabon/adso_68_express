const { z } = require('zod');

const SORT_OPTIONS = ['created_desc', 'created_asc', 'price_asc', 'price_desc', 'name_asc', 'name_desc'];

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL']).optional(),
  sort: z.enum(SORT_OPTIONS).default('created_desc'),
});

const productBaseSchema = {
  sku: z
    .string()
    .trim()
    .min(2, 'El SKU debe tener al menos 2 caracteres')
    .max(60)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'SKU inválido (letras, números, punto, guion y guion bajo)'),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido (solo minúsculas, números y guiones)')
    .optional(),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL']).default('PHYSICAL'),
  price: z.coerce
    .number()
    .min(0.01, 'El precio debe ser mayor a 0')
    .max(999999999999.99, 'El precio excede el máximo soportado'),
  cost: z.coerce.number().min(0).max(999999999999.99).optional(),
  // Umbral de stock bajo (solo PHYSICAL): '' o null → undefined.
  minStock: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).max(999999999).optional()
  ),
  // Campos opcionales: '' o null se normalizan a undefined antes de validar.
  categoryId: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
  imageUrl: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.string().trim().url('URL de imagen inválida').max(500).optional()
  ),
  active: z.boolean().default(true),
};

const createProductSchema = z.object(productBaseSchema);

const updateProductSchema = z
  .object(
    Object.fromEntries(Object.entries(productBaseSchema).map(([key, schema]) => [key, schema.optional()]))
  )
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay campos para actualizar' });

module.exports = { listQuerySchema, createProductSchema, updateProductSchema, SORT_OPTIONS };
