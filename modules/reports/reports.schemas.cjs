const { z } = require('zod');

// Parámetros de los reportes (whitelist estricta; todo lo demás se descarta).
const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  topLimit: z.coerce.number().int().min(1).max(20).default(5),
  recentLimit: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = { dashboardQuerySchema };
