-- Fase 6: mejoras de inventario (aditivas, no destructivas).
-- 1) min_stock: umbral de stock bajo por producto (0 = sin alerta).
-- 2) inventory_movements.balance_after: saldo resultante tras cada movimiento,
--    necesario para un kardex auditable (recalcularlo retroactivamente es
--    frágil cuando hay movimientos ADJUST absolutos).
ALTER TABLE products
  ADD COLUMN min_stock DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER cost;

ALTER TABLE inventory_movements
  ADD COLUMN balance_after DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER quantity;
