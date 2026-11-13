const express = require('express');
const cors = require('cors');
const login = require('./routes/login.cjs');
const register = require('./routes/register.cjs');
const productos = require('./routes/productos.cjs');
const health = require('./routes/health.cjs');
const authRoutes = require('./modules/auth/auth.routes.cjs');
const categoriesRoutes = require('./modules/categories/categories.routes.cjs');
const productsRoutes = require('./modules/products/products.routes.cjs');
const inventoryRoutes = require('./modules/inventory/inventory.routes.cjs');
const ordersRoutes = require('./modules/orders/orders.routes.cjs');
const reportsRoutes = require('./modules/reports/reports.routes.cjs');
const env = require('./config/env.cjs');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler.cjs');
const { authenticate } = require('./middlewares/auth.cjs');

const app = express();

// CORS restringido al origen del frontend (ya no comodín).
// Peticiones sin header Origin (curl/Postman) siguen funcionando para desarrollo.
app.use(
  cors({
    origin: [env.frontendUrl],
    credentials: false,
  })
);

// Límite de payload y parseo JSON (se reemplaza body-parser por el parser nativo).
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// --- Endpoints actuales (compatibilidad: NO cambiar contratos) ---
app.post('/api/login', login);
app.post('/api/register', register);

// Fase 2: la ruta de productos ahora exige token válido (antes quedaba expuesta).
app.get('/api/productos', authenticate, productos);

// --- API v1 ---
app.get('/api/v1/health', health);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/orders', ordersRoutes);

// Rutas no encontradas y manejo central de errores.
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor escuchando en el puerto ${env.port}`);
});
