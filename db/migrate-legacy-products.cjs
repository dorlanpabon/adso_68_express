// Migración de datos de la tabla legacy `productos` → `products`.
// NO destructiva: la tabla legacy no se toca ni se elimina.
// Idempotente: usa SKU determinista LEG-XXXX y salta los ya insertados.
// Nota: `productos.cantidad` es texto libre sin formato numérico, por lo que
// NO genera inventario; las existencias se cargan por la Fase 6.
// Uso: node db/migrate-legacy-products.cjs

const pool = require('../utils/db.cjs');
const { slugify } = require('../utils/slugify.cjs');

async function main() {
  const [legacy] = await pool.query('SELECT id, nombre, precio_compra, precio_venta, ubicacion FROM productos ORDER BY id');
  let insertados = 0;
  let omitidos = 0;

  for (const row of legacy) {
    const sku = `LEG-${String(row.id).padStart(4, '0')}`;
    const baseSlug = slugify(row.nombre) || `producto-${row.id}`;
    const slug = `${baseSlug}-${row.id}`;

    const [existe] = await pool.query('SELECT id FROM products WHERE sku = ? LIMIT 1', [sku]);
    if (existe[0]) {
      omitidos += 1;
      continue;
    }

    await pool.query(
      `INSERT INTO products (sku, name, slug, description, type, price, cost, active)
       VALUES (?, ?, ?, ?, 'PHYSICAL', ?, ?, 1)`,
      [
        sku,
        row.nombre,
        slug,
        `Producto migrado de la tabla legacy (ubicación original: ${row.ubicacion}).`,
        row.precio_venta ?? 0,
        row.precio_compra ?? null,
      ]
    );
    insertados += 1;
  }

  console.log(`Migración legacy: ${insertados} insertados, ${omitidos} omitidos (ya existían). Legacy intacta.`);
  await pool.end();
}

main().catch((error) => {
  console.error(`Migración legacy falló: ${error.message}`);
  process.exit(1);
});
