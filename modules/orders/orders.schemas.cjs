const { z } = require('zod');

// El cliente solo declara QUÉ compra y CUÁNTO. Precios, totales y descuentos
// de inventario se calculan SIEMPRE en el servidor con DECIMAL.
const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive('Producto requerido'),
        quantity: z.coerce
          .number()
          .int('La cantidad debe ser un entero')
          .min(1, 'La cantidad mínima es 1')
          .max(999, 'Cantidad demasiado alta'),
      })
    )
    .min(1, 'El carrito está vacío')
    .max(50, 'Demasiadas líneas de pedido'),
  customer: z.object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
    email: z.string().trim().email('Correo inválido').max(150),
    phone: z.string().trim().max(30).optional(),
  }),
  // Opcional: bodega desde la que se despacha. Por defecto la primera activa.
  warehouseId: z.coerce.number().int().positive().optional(),
  // Idempotencia: misma clave = mismo pedido (reintentos de red / doble click).
  idempotencyKey: z
    .string()
    .trim()
    .min(8, 'La clave de idempotencia es demasiado corta')
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, 'Clave de idempotencia inválida')
    .optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

module.exports = { checkoutSchema, listQuerySchema };
