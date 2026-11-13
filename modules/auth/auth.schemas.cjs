// Esquemas de validación (Zod) para autenticación.
// El registro público crea usuarios sin rol; los roles se introducen en Fase 3
// y a partir de ahí todo registro nuevo será CUSTOMER.

const { z } = require('zod');

const loginSchema = z.object({
  usuario: z
    .string({ message: 'El usuario debe ser texto' })
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(100, 'El usuario no puede exceder 100 caracteres'),
  clave: z
    .string({ message: 'La clave debe ser texto' })
    .min(4, 'La clave debe tener al menos 4 caracteres')
    .max(100, 'La clave no puede exceder 100 caracteres'),
});

const registerSchema = loginSchema;

module.exports = { loginSchema, registerSchema };
