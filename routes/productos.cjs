const pool = require('../utils/db.cjs');
const { verificarToken } = require('../utils/jwt.js');

async function productos(req, res) {
  const token = req.headers['authorization'];

  try {
    verificarToken(token);
    const results = await pool.query('SELECT * FROM productos');
    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en la consulta');
  }
}

module.exports = productos;