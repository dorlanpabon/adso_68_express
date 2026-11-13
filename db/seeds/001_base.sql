-- Seed base (idempotente con INSERT IGNORE): roles y bodega principal.
-- Se ejecuta con: node db/migrate.cjs --seed
-- Nunca incluir datos de demostración aquí.

INSERT IGNORE INTO roles (code, name) VALUES
  ('ADMIN', 'Administrador'),
  ('WAREHOUSE', 'Bodega'),
  ('SALES', 'Ventas'),
  ('CUSTOMER', 'Cliente');

INSERT IGNORE INTO warehouses (code, name, location) VALUES
  ('BOD-01', 'Bodega principal', 'Sede local');
