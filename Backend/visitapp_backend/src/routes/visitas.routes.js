"use strict";
const express = require("express");
const db      = require("../config/db");
const { autenticar } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(autenticar);

// ── GET /api/visitas ─────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const { documento = "", fecha_desde = "", fecha_hasta = "",
                resultado = "", page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const params = [], wheres = [];
        let i = 1;

        if (documento)   { wheres.push(`v.documento ILIKE '%' || $${i} || '%'`);  params.push(documento);   i++; }
        if (fecha_desde) { wheres.push(`v.fecha_hora >= $${i}`);  params.push(fecha_desde); i++; }
        if (fecha_hasta) { wheres.push(`v.fecha_hora <= $${i}`);  params.push(fecha_hasta); i++; }
        if (resultado)   { wheres.push(`v.resultado = $${i}`);    params.push(resultado);   i++; }

        const where = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";

        const { rows } = await db.query(
            `SELECT
                v.id, v.documento,
                p.nombres || ' ' || p.apellidos AS nombre_completo,
                p.departamento,
                v.tipo_evento, v.resultado, v.mensaje,
                v.mac_equipo, v.ip_equipo, v.hostname_equipo,
                v.dedo_usado, v.score_biometrico, v.operador, v.fecha_hora,
                -- Jerarquía completa del PDV
                pdv.nombre                AS punto_venta,
                pdv_o.nombre              AS oficina,
                pdv_c.nombre              AS celula,
                pdv_s.nombre              AS subzona,
                pdv_z.nombre              AS zona,
                pdv_d.nombre              AS departamento_pdv
             FROM visitas.visitas v
             LEFT JOIN visitas.personas      p     ON p.id = v.persona_id
             LEFT JOIN visitas.puntosdeventa pdv   ON pdv.mac_address = v.mac_equipo
             LEFT JOIN visitas.oficinas      pdv_o ON pdv_o.id = pdv.oficina_id
             LEFT JOIN visitas.celulas       pdv_c ON pdv_c.id = pdv_o.celula_id
             LEFT JOIN visitas.subzonas      pdv_s ON pdv_s.id = pdv_c.subzona_id
             LEFT JOIN visitas.zonas         pdv_z ON pdv_z.id = pdv_s.zona_id
             LEFT JOIN visitas.departamentos pdv_d ON pdv_d.id = pdv_z.departamento_id
             ${where}
             ORDER BY v.fecha_hora DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            [...params, parseInt(limit), offset]
        );

        const { rows: total } = await db.query(
            `SELECT COUNT(*) FROM visitas.visitas v ${where}`, params
        );

        res.json({ data: rows, total: parseInt(total[0].count), page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("[visitas/GET]", err);
        res.status(500).json({ error: "Error consultando visitas" });
    }
});

// ── GET /api/visitas/resumen ─────────────────────────────────
router.get("/resumen", async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                COUNT(*)                                     AS total_hoy,
                COUNT(*) FILTER (WHERE resultado = 'OK')    AS exitosas_hoy,
                COUNT(*) FILTER (WHERE resultado = 'FALLO') AS fallidas_hoy,
                COUNT(*) FILTER (WHERE resultado = 'ERROR') AS errores_hoy,
                COUNT(DISTINCT documento)                    AS personas_distintas_hoy
            FROM visitas.visitas WHERE fecha_hora >= CURRENT_DATE
        `);
        res.json(rows[0]);
    } catch (err) {
        console.error("[visitas/resumen]", err);
        res.status(500).json({ error: "Error obteniendo resumen" });
    }
});

module.exports = router;
