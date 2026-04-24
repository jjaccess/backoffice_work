-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar latitud y longitud a puntosdeventa
-- Ejecutar en PostgreSQL como usuario postgres
-- ═══════════════════════════════════════════════════════════

-- 1. Agregar columnas a la tabla
ALTER TABLE visitas.puntosdeventa
  ADD COLUMN IF NOT EXISTS latitud NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitud NUMERIC(10,7);

COMMENT ON COLUMN visitas.puntosdeventa.latitud IS 'Latitud GPS del punto de venta';
COMMENT ON COLUMN visitas.puntosdeventa.longitud IS 'Longitud GPS del punto de venta';

-- 2. Recrear la vista v_puntosdeventa para incluir las coordenadas
CREATE OR REPLACE VIEW visitas.v_puntosdeventa AS
SELECT
    pdv.id        AS pdv_id,
    dep.nombre    AS departamento,
    z.nombre      AS zona,
    sz.nombre     AS subzona,
    c.nombre      AS celula,
    o.nombre      AS oficina,
    pdv.nombre    AS punto_venta,
    pdv.mac_address,
    pdv.direccion,
    pdv.latitud,
    pdv.longitud,
    pdv.activo,
    pdv.created_at,
    dep.id AS departamento_id,
    z.id   AS zona_id,
    sz.id  AS subzona_id,
    c.id   AS celula_id,
    o.id   AS oficina_id
FROM visitas.puntosdeventa pdv
JOIN visitas.oficinas o     ON o.id  = pdv.oficina_id
JOIN visitas.celulas c      ON c.id  = o.celula_id
JOIN visitas.subzonas sz    ON sz.id = c.subzona_id
JOIN visitas.zonas z        ON z.id  = sz.zona_id
JOIN visitas.departamentos dep ON dep.id = z.departamento_id;

-- 3. Otorgar permisos a la app
GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE visitas.v_puntosdeventa TO visitas_app;
