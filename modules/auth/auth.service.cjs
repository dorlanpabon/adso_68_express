// Lógica de negocio de autenticación: hash, comparación, emisión de token.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env.cjs');
const { ApiError } = require('../../middlewares/errorHandler.cjs');
const repo = require('./auth.repository.cjs');

const MENSAJE_CREDENCIALES = 'Usuario o clave incorrectos';

// Token nuevo: incluye id y usuario. Expira en 1h (igual que el comportamiento actual).
const generarToken = (user) =>
  jwt.sign({ id: user.id, usuario: user.usuario }, env.jwtSecret, { expiresIn: '1h' });

const register = async ({ usuario, clave }) => {
  const existing = await repo.findByUsuario(usuario);
  if (existing) {
    throw new ApiError(409, 'El usuario ya existe', 'CONFLICT');
  }
  // Registro público SIEMPRE crea CUSTOMER; nunca se permite elegir rol.
  const roleId = await repo.findRoleIdByCode('CUSTOMER');
  if (!roleId) {
    throw new ApiError(500, 'Roles no inicializados: ejecute los seeds de la base de datos', 'SEED_MISSING');
  }
  const claveHash = await bcrypt.hash(clave, 10);
  const id = await repo.insertUsuario(usuario, claveHash, roleId);
  return { id, usuario, role: 'CUSTOMER' };
};

const login = async ({ usuario, clave }) => {
  const user = await repo.findByUsuario(usuario);

  // Mensaje prudente idéntico para usuario inexistente y clave errónea,
  // evitando enumeración de cuentas.
  if (!user) {
    throw new ApiError(401, MENSAJE_CREDENCIALES, 'UNAUTHORIZED');
  }

  let isMatch = false;
  try {
    // Si el hash almacenado está corrupto o no es bcrypt, comparar lanza:
    // se trata como credenciales inválidas, no como error 500.
    isMatch = await bcrypt.compare(clave, user.clave);
  } catch {
    isMatch = false;
  }

  if (!isMatch) {
    throw new ApiError(401, MENSAJE_CREDENCIALES, 'UNAUTHORIZED');
  }

  return { token: generarToken(user), user: { id: user.id, usuario: user.usuario, role: user.role_code || null } };
};

const me = async (userId) => {
  const user = await repo.findById(userId);
  if (!user) {
    throw new ApiError(401, 'Usuario no encontrado para el token', 'UNAUTHORIZED');
  }
  return { id: user.id, usuario: user.usuario, role: user.role_code || null };
};

module.exports = { register, login, me };
