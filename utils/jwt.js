const jwt = require('jsonwebtoken');

const generarToken = (usuario) => {
  const payload = { usuario };
  const secret = process.env.JWT_SECRET; // Clave secreta para firmar el token
  const options = { expiresIn: '1h' }; // Tiempo de expiración del token

  return jwt.sign(payload, secret, options);
}

const verificarToken = (token) => {
  const secret = process.env.JWT_SECRET; // Clave secreta para verificar el token

  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    return null; // Token inválido o expirado
  }
}

module.exports = { generarToken, verificarToken };