const express = require('express');
const app = express();
const port = 3000;

const usuarios = [
  { usuario: 'jpabon', clave: '123' },
  { usuario: 'admin', clave: 'admin' },
  { usuario: 'user', clave: 'password'},
  { usuario: 'test', clave: 'test' }
];

app.get('/api/login', (req, res) => {
  const usuario = req.query.usuario;
  const clave = req.query.clave;

  const existe = usuarios.some(u => u.usuario === usuario && u.clave === clave);
  if (existe) {
    res.send('Login exitoso');
  } else {
    res.send('Usuario o clave incorrectos');
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});