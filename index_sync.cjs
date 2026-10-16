const express = require('express');
const app = express();
const port = 3000;
// Get the client
const mysql = require('mysql2');

// Create the connection to database
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'adso_68_express',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

app.get('/api/login', (req, res) => {
  const usuario = req.query.usuario;
  const clave = req.query.clave;
  // Using placeholders
  pool.query(
    'SELECT * FROM usuarios WHERE usuario = ? AND clave = ?',
    [usuario, clave],
    function (err, results) {
      if (err) {
        console.error(err);
        res.status(500).send('Error en la consulta');
        return;
      }

      console.log(results);

      //length - tamaño
      if (results.length > 0) {
        res.send('Login exitoso');
      } else {
        res.send('Usuario o clave incorrectos');
      }
    }
  );
});

app.get('/api/register', (req, res) => {
  const usuario = req.query.usuario;
  const clave = req.query.clave;
  // Using placeholders
  pool.query(
    'SELECT * FROM usuarios WHERE usuario = ?',
    [usuario],
    function (err, results) {
      if (err) {
        console.error(err);
        res.status(500).send('Error en la consulta');
        return;
      }

      //length - tamaño
      if (results.length > 0) {
        res.status(400).send('Usuario ya existe');

      } else {

        pool.query(
          'INSERT INTO usuarios (usuario, clave) VALUES (?, ?)',
          [usuario, clave],
          function (err, results) {
            if (err) {
              console.error(err);
              res.status(500).send('Error en la consulta');
              return;
            }

            res.send('Usuario registrado exitosamente');
          }
        )

      }
    }
  );
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});