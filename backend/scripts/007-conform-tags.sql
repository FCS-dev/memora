-- 007-conform-tags.sql
-- Puesta en conformidad de etiquetas previa a la Spec 007 (RF-20, RNF-4).
-- Idempotente: puede reejecutarse sin alterar un estado ya conforme.
-- Ejecutar UNA vez sobre la base de datos existente antes de desplegar la versión
-- que agrega la restricción única (user_id, tag_name). En bases nuevas no hace falta.
-- Si el índice uk_tags_owner_name ya existe y no hay duplicados, es un no-op.
--
-- Nota: DB_URL es una URL JDBC (jdbc:postgresql://...), que psql no acepta. Usar:
--   set -a && source .env && set +a
--   PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" \
--     -d "$DB_NAME" -f backend/scripts/007-conform-tags.sql
--
-- Pasos:
--   1. Normalizar tag_name (trim, espacios internos, NFC, minúsculas).
--   2. Fusionar duplicados por dueño conservando el menor id.
--   3. Resolver coincidencias privada<->global (gana la global del ADMIN).
--   4. Crear el índice único uk_tags_owner_name.

BEGIN;

-- 1. Normalizar nombres.
UPDATE tags
SET tag_name = lower(regexp_replace(normalize(btrim(tag_name), NFC), '\s+', ' ', 'g'))
WHERE tag_name IS DISTINCT FROM lower(regexp_replace(normalize(btrim(tag_name), NFC), '\s+', ' ', 'g'));

-- 2. Duplicados por (user_id, tag_name): conservar el menor id.
CREATE TEMP TABLE _tag_dupes ON COMMIT DROP AS
SELECT id AS dup_id, keeper_id
FROM (
    SELECT id,
           first_value(id) OVER (PARTITION BY user_id, tag_name ORDER BY id) AS keeper_id,
           row_number() OVER (PARTITION BY user_id, tag_name ORDER BY id) AS rn
    FROM tags
) ranked
WHERE rn > 1;

UPDATE note_tags nt
SET tag_id = d.keeper_id
FROM _tag_dupes d
WHERE nt.tag_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM note_tags x WHERE x.note_id = nt.note_id AND x.tag_id = d.keeper_id
  );

DELETE FROM note_tags nt USING _tag_dupes d WHERE nt.tag_id = d.dup_id;
DELETE FROM tags t USING _tag_dupes d WHERE t.id = d.dup_id;

-- 3. Coincidencias privada<->global: gana la global del ADMIN (menor id).
CREATE TEMP TABLE _tag_collisions ON COMMIT DROP AS
SELECT t.id AS private_id, g.id AS global_id
FROM tags t
JOIN tags g
  ON g.tag_name = t.tag_name
 AND g.user_id = (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1)
WHERE t.user_id <> (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1);

UPDATE note_tags nt
SET tag_id = c.global_id
FROM _tag_collisions c
WHERE nt.tag_id = c.private_id
  AND NOT EXISTS (
    SELECT 1 FROM note_tags x WHERE x.note_id = nt.note_id AND x.tag_id = c.global_id
  );

DELETE FROM note_tags nt USING _tag_collisions c WHERE nt.tag_id = c.private_id;
DELETE FROM tags t USING _tag_collisions c WHERE t.id = c.private_id;

-- 4. Garantía de unicidad por dueño.
CREATE UNIQUE INDEX IF NOT EXISTS uk_tags_owner_name ON tags (user_id, tag_name);

COMMIT;
