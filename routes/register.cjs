const pool = require('../utils/db.cjs');
const bcrypt = require('bcrypt');

async function register(req, res) {
  const usuario = req.body.usuario;
  const clave = req.body.clave;
  // Using placeholders
  try {
    const results = await pool.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
    if (results[0].length > 0) {
      res.status(400).json({ message: 'El usuario ya existe' });
    } else {
      const hashedPassword = await bcrypt.hash(clave, 10);
      await pool.query('INSERT INTO usuarios (usuario, clave) VALUES (?, ?)', [usuario, hashedPassword]);
      res.json({ message: 'Usuario registrado exitosamente' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en la solicitud' });
  }
}

module.exports = register;