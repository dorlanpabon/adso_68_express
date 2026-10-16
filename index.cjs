const express = require('express');
const app = express();
const port = 3000;
const login = require('./routes/login.cjs');
const register = require('./routes/register.cjs');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/login', login);

app.post('/api/register', register);

//path
//app.path

//eliminar usar delete
//app.delete

//obtener informacion
//app.get

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});