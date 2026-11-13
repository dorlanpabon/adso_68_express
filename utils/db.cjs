// Pool de conexiones MySQL.
// Fase 1: ahora lee credenciales desde variables de entorno (config/env.cjs),
// con los mismos valores locales de siempre como fallback, para no romper
// login/register/productos.

const mysql = require('mysql2/promise');
const env = require('../config/env.cjs');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Evitar fuga de detalles de SQL al cliente mediante mensajes genéricos:
  // los errores se manejan en middlewares/errorHandler.cjs.
});

module.exports = pool;
