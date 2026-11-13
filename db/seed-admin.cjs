// Seed controlado de la cuenta ADMIN inicial.
// Uso (la credencial NUNCA queda en código ni en el repo):
//   node db/seed-admin.cjs --usuario <nombre> --clave <contraseña>
// No ejecutar en producción con claves de desarrollo.

const bcrypt = require('bcrypt');
const pool = require('../utils/db.cjs');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function main() {
  const usuario = arg('usuario');
  const clave = arg('clave');

  if (!usuario || !clave) {
    console.error('Falta --usuario y/o --clave. Ejemplo: node db/seed-admin.cjs --usuario admin --clave "********"');
    process.exit(1);
  }
  if (clave.length < 12) {
    console.error('La clave del ADMIN debe tener al menos 12 caracteres.');
    process.exit(1);
  }

  const [roles] = await pool.query("SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1");
  if (!roles[0]) {
    console.error("No existe el rol ADMIN. Ejecuta primero: node db/migrate.cjs --seed");
    process.exit(1);
  }

  const [existente] = await pool.query('SELECT id FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
  if (existente[0]) {
    console.error(`El usuario "${usuario}" ya existe (id ${existente[0].id}). No se modifica nada.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(clave, 10);
  const [result] = await pool.query(
    'INSERT INTO usuarios (usuario, clave, role_id) VALUES (?, ?, ?)',
    [usuario, hash, roles[0].id]
  );

  console.log(`ADMIN creado con id ${result.insertId}. La clave no se imprime ni se guarda en claro.`);
  await pool.end();
}

main().catch((error) => {
  console.error(`Seed ADMIN falló: ${error.message}`);
  process.exit(1);
});
