-- Fase 7: idempotencia de checkout.
-- La clave la genera el cliente y se reenvía en reintentos (doble click,
-- timeouts de red): con el índice UNIQUE, un reenvío devuelve el pedido
-- original en vez de crear un segundo pedido (y descontar inventario dos veces).
-- NULL (varios permitidos) = checkout sin clave explícita.
ALTER TABLE orders
  ADD COLUMN idempotency_key VARCHAR(64) NULL AFTER order_number,
  ADD UNIQUE KEY uq_orders_idempotency (idempotency_key);
