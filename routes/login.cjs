
const pool = require('../utils/db.cjs');

async function login(req, res) {
  const usuario = req.body.usuario;
  const clave = req.body.clave;
  console.log(usuario, clave);

  try {
    // Using placeholders
    const results = await pool.query('SELECT * FROM usuarios WHERE usuario = ? AND clave = ?', [usuario, clave]);

    console.log(results);


    if (results[0].length > 0) {
      res.send('Login exitoso');
    } else {
      res.send('Usuario o clave incorrectos');
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('Error en la consulta');
  }
}

module.exports = login;