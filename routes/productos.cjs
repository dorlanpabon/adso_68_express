const pool = require('../utils/db.cjs');

// Fase 2: la autenticación la hace el middleware `authenticate` en index.cjs.
// Este handler asume req.user ya validado.
async function productos(req, res) {
  try {
    const results = await pool.query('SELECT * FROM productos');
    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en la consulta');
  }
}

module.exports = productos;