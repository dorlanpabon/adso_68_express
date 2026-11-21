-- 000: tabla base de usuarios (esquema original de XAMPP que nunca se versionó).
-- Las migraciones 001/005/006/007 le agregan columnas y le apuntan FKs,
-- así que DEBE existir antes que ellas en una base vacía (TiDB Cloud/Render).
-- En la BD local ya existe: IF NOT EXISTS la deja intacta con sus 14 filas.
-- id INT FIRMADO: las FK hacia él (actor_user_id, user_id) también son INT firmado.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(100) NOT NULL UNIQUE,
  clave VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
