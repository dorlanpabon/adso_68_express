// Controladores de auth: HTTP in/out, sin SQL ni lógica de negocio.

const { ok } = require('../../middlewares/errorHandler.cjs');
const service = require('./auth.service.cjs');

const register = async (req, res, next) => {
  try {
    const user = await service.register(req.body);
    return ok(res, { usuario: user.usuario }, undefined, 201);
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await service.login(req.body);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
};

// El JWT es stateless: el cierre de sesión se materializa descartando el token
// en el cliente. Con sesiones/servidor de estado este endpoint haría más.
const logout = async (req, res) => {
  return ok(res, { message: 'Sesión finalizada. Descarte el token en el cliente.' });
};

const me = async (req, res, next) => {
  try {
    const user = await service.me(req.user.id);
    return ok(res, user);
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, logout, me };
