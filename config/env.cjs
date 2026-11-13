// Configuración central de variables de entorno.
// Los valores por defecto replican la configuración local actual (XAMPP) para
// mantener compatibilidad con login/register existentes.

require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'adso_68_express',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET || '',

  apiPrefix: '/api/v1',
};

// JWT_SECRET es obligatorio para que login funcione.
if (!env.jwtSecret) {
  // eslint-disable-next-line no-console
  console.error('[env] Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

// En producción se exige un secreto robusto (el valor de desarrollo no es válido).
if (env.isProd && (!env.jwtSecret || env.jwtSecret.length < 32 || env.jwtSecret === 'adso68')) {
  // eslint-disable-next-line no-console
  console.error('[env] JWT_SECRET en producción debe tener al menos 32 caracteres y no ser el valor de desarrollo.');
  process.exit(1);
}

module.exports = env;
