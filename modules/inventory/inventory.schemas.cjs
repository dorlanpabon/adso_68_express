const { z } = require('zod');

// Tipos operables por API en esta fase. RESERVE/RELEASE quedan reservados
// para el checkout de la Fase 7 (los genera el sistema, no el usuario).
const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUST'];

const createMovementSchema = z.object({
  productId: z.coerce.number().int().positive('Producto requerido'),
  warehouseId: z.coerce.number().int().positive('Bodega requerida'),
  type: z.enum(MOVEMENT_TYPES),
  // IN/OUT: cantidad del movimiento (>0). ADJUST: valor absoluto nuevo (>=0).
  quantity: z.coerce
    .number()
    .min(0, 'La cantidad no puede ser negativa')
    .max(999999999, 'La cantidad excede el máximo soportado'),
  reason: z.string().trim().max(255).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.coerce.number().int().positive().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  type: z.enum(['IN', 'OUT', 'ADJUST', 'RESERVE', 'RELEASE']).optional(),
});

const balancesQuerySchema = z.object({
  warehouseId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  lowStock: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional(),
});

module.exports = { createMovementSchema, listQuerySchema, balancesQuerySchema, MOVEMENT_TYPES };
