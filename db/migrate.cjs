// Runner de migraciones/seeds versionados.
// Uso:
//   node db/migrate.cjs          → aplica migraciones pendientes (db/migrations)
//   node db/migrate.cjs --seed   → aplica seeds pendientes (db/seeds, idempotentes)
// Cada archivo .sql se ejecuta UNA sola vez y queda registrado en `_migrations`.
// Nunca ejecutar seeds de demostración en producción.

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env.cjs');

const dir = process.argv.includes('--seed') ? 'seeds' : 'migrations';
const dirPath = path.join(__dirname, dir);

async function main() {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
  });

  await conn.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name VARCHAR(255) PRIMARY KEY,
       applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB`
  );

  const [rows] = await conn.query('SELECT name FROM _migrations');
  const applied = new Set(rows.map((r) => r.name));

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.sql')).sort();
  let pendientes = 0;

  for (const file of files) {
    const key = `${dir}/${file}`;
    if (applied.has(key)) {
      console.log(`= ya aplicada: ${key}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dirPath, file), 'utf8');
    const result = await conn.query(sql);
    await conn.query('INSERT INTO _migrations (name) VALUES (?)', [key]);
    pendientes += 1;
    console.log(`+ aplicada: ${key}`);
    void result;
  }

  await conn.end();
  console.log(`Listo: ${dir} al día (${pendientes} nuevas).`);
}

main().catch((error) => {
  console.error(`Migración/seeds falló: ${error.message}`);
  process.exit(1);
});
