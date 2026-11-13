
const pool = require('../utils/db.cjs');
const { generarToken } = require('../utils/jwt.js');
const bcrypt = require('bcrypt');

async function login(req, res) {
  const usuario = req.body.usuario;
  const clave = req.body.clave;

  try {
    // Using placeholders
    const results = await pool.query('SELECT * FROM usuarios WHERE usuario = ? ', [usuario]);

    if (results[0].length > 0) {
      const isMatch = await bcrypt.compare(clave, results[0][0].clave);
      if (!isMatch) {
        res.status(401).json({ message: 'Usuario o clave incorrectos' });
        return;
      }
      const token = generarToken(usuario);
      res.json({ message: 'Inicio de sesión exitoso', token });
    } else {
      res.status(401).json({ message: 'Usuario o clave incorrectos' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('Error en la consulta');
  }
}

module.exports = login;