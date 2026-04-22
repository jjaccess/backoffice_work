"use strict";
const express = require("express");
const http    = require("http");
const db      = require("../config/db");
const { autenticar, autorizar } = require("../middlewares/auth.middleware");

const router = express.Router();

// ── Llamar al matcher Java (SourceAFIS) ──────────────────────
function matchHuellas(probeB64, candidatesB64) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ probe: probeB64, candidates: candidatesB64 });
        const req  = http.request({
            hostname: "localhost", port: 3001, path: "/match", method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try   { resolve(JSON.parse(data)); }
                catch { reject(new Error("Respuesta inválida del matcher")); }
            });
        });
        req.on("error", reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout matcher")); });
        req.write(body);
        req.end();
    });
}

function limpiarTemplate(t) {
    if (!t) return '';
    let s = t.trim();
    if (s.startsWith('<') && s.includes('|')) s = s.substring(s.indexOf('|') + 1);
    if (s.endsWith('>')) s = s.slice(0, -1);
    return s.replace(/\s/g, '');
}

// ════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS
// ════════════════════════════════════════════════════════════

// ── POST /api/huellas/obtener-templates ──────────────────────
// FIX #3 — El quiosco llama esto ANTES de capturar.
// Si la persona no existe o no tiene huellas → 404 → quiosco no pide huella
router.post("/obtener-templates", async (req, res) => {
    try {
        const { documento } = req.body;
        if (!documento) return res.status(400).json({ error: "documento requerido" });

        const { rows: personas } = await db.query(
            `SELECT id, nombres || ' ' || apellidos AS nombre_completo,
                    departamento, foto_base64
             FROM visitas.personas WHERE documento = $1 AND activo = TRUE`,
            [documento]
        );
        if (!personas.length)
            return res.status(404).json({ error: "Documento no registrado en el sistema" });

        const { rows: huellas } = await db.query(
            `SELECT id, dedo, template_iso, calidad FROM visitas.huellas
             WHERE persona_id = $1 AND activo = TRUE ORDER BY dedo`,
            [personas[0].id]
        );
        if (!huellas.length)
            return res.status(404).json({ error: "Persona no tiene huellas registradas" });

        res.json({
            persona_id:      personas[0].id,
            nombre_completo: personas[0].nombre_completo,
            departamento:    personas[0].departamento,
            foto_base64:     personas[0].foto_base64,
            templates:       huellas
        });
    } catch (err) {
        console.error("[huellas/obtener-templates]", err);
        res.status(500).json({ error: "Error consultando templates" });
    }
});

// ── POST /api/huellas/verificar ──────────────────────────────
// FIX #4 — Solo registra eventos OK en BD, no los fallos por doc inexistente
router.post("/verificar", async (req, res) => {
    try {
        const { documento, mac_equipo, ip_equipo, hostname_equipo,
                dedo_usado, template_capturado } = req.body;

        if (!documento || !mac_equipo)
            return res.status(400).json({ error: "documento y mac_equipo requeridos" });

        // Buscar persona
        const { rows: personas } = await db.query(
            `SELECT id, nombres || ' ' || apellidos AS nombre_completo,
                    departamento, foto_base64
             FROM visitas.personas WHERE documento = $1 AND activo = TRUE`,
            [documento]
        );

        if (!personas.length) {
            // FIX #4 — No registrar en BD si el documento no existe
            return res.json({
                resultado:  "FALLO",
                mensaje:    "Documento no registrado en el sistema",
                visita_id:  null,
                fecha_hora: new Date().toISOString(),
                persona:    null
            });
        }

        const persona_id      = personas[0].id;
        const nombre_completo = personas[0].nombre_completo;
        let resultado_final = "FALLO", mensaje = "", score = null;

        if (!template_capturado) {
            resultado_final = "FALLO";
            mensaje = "No se recibió huella";
        } else {
            const { rows: huellas } = await db.query(
                `SELECT template_iso FROM visitas.huellas
                 WHERE persona_id = $1 AND activo = TRUE`,
                [persona_id]
            );

            if (!huellas.length) {
                resultado_final = "FALLO";
                mensaje = "Persona sin huellas registradas";
            } else {
                try {
                    const probeClean      = limpiarTemplate(template_capturado);
                    const candidatesClean = huellas.map(h => limpiarTemplate(h.template_iso));
                    const match           = await matchHuellas(probeClean, candidatesClean);

                    score = match.score;
                    if (match.match) {
                        resultado_final = "OK";
                        mensaje = `Identidad verificada (score: ${match.score})`;
                    } else {
                        resultado_final = "FALLO";
                        mensaje = "Huella no coincide con la registrada";
                    }
                    console.log(`[verificar] doc=${documento} match=${match.match} score=${match.score}`);
                } catch (matchErr) {
                    console.error("[verificar] Error matcher:", matchErr.message);
                    resultado_final = "ERROR";
                    mensaje = "Error en servicio de cotejo. ¿Está corriendo el matcher?";
                }
            }
        }

        // FIX #4 — Solo registrar en BD si resultado es OK
        // Los fallos de huella no coincide SÍ se registran (son intentos válidos)
        // Los errores de sistema NO se registran
        let visita_id  = null;
        let fecha_hora = new Date().toISOString();

        if (resultado_final !== "ERROR") {
            const { rows: visita } = await db.query(
                `INSERT INTO visitas.visitas
                    (persona_id, documento, mac_equipo, ip_equipo, hostname_equipo,
                     tipo_evento, resultado, mensaje, dedo_usado, score_biometrico, operador)
                 VALUES ($1,$2,$3,$4,$5,'ENTRADA',$6,$7,$8,$9,'quiosco')
                 RETURNING id, fecha_hora`,
                [persona_id, documento, mac_equipo, ip_equipo || null,
                 hostname_equipo || null, resultado_final, mensaje,
                 dedo_usado || null, score]
            );
            visita_id  = visita[0]?.id;
            fecha_hora = visita[0]?.fecha_hora;
        }

        res.json({
            resultado: resultado_final, mensaje,
            visita_id, fecha_hora,
            persona: {
                id: persona_id, nombre_completo,
                foto_base64: personas[0]?.foto_base64 || null
            }
        });

    } catch (err) {
        console.error("[huellas/verificar]", err);
        res.status(500).json({ error: "Error en verificación" });
    }
});

// ════════════════════════════════════════════════════════════
// RUTAS PROTEGIDAS
// ════════════════════════════════════════════════════════════
router.use(autenticar);

router.post("/enrolar", autorizar("ADMIN", "OPERADOR"), async (req, res) => {
    try {
        const { persona_id, dedo = 1, template_iso, imagen_wsq, calidad } = req.body;
        if (!persona_id || !template_iso)
            return res.status(400).json({ error: "persona_id y template_iso requeridos" });

        const { rows: persona } = await db.query(
            "SELECT id FROM visitas.personas WHERE id = $1 AND activo = TRUE", [persona_id]
        );
        if (!persona.length) return res.status(404).json({ error: "Persona no encontrada" });

        const templateLimpio = limpiarTemplate(template_iso);

        const { rows } = await db.query(
            `INSERT INTO visitas.huellas (persona_id, dedo, template_iso, imagen_wsq, calidad)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (persona_id, dedo)
             DO UPDATE SET template_iso=EXCLUDED.template_iso, imagen_wsq=EXCLUDED.imagen_wsq,
                           calidad=EXCLUDED.calidad, activo=TRUE, created_at=NOW()
             RETURNING id, persona_id, dedo, calidad, created_at`,
            [persona_id, dedo, templateLimpio, imagen_wsq || null, calidad || null]
        );
        res.status(201).json({ mensaje: "Huella enrolada correctamente", huella: rows[0] });
    } catch (err) {
        console.error("[huellas/enrolar]", err);
        res.status(500).json({ error: "Error enrolando huella" });
    }
});

router.get("/persona/:persona_id", async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, dedo, calidad, activo, created_at FROM visitas.huellas WHERE persona_id=$1 ORDER BY dedo",
            [req.params.persona_id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Error consultando huellas" }); }
});

router.delete("/:id", autorizar("ADMIN"), async (req, res) => {
    try {
        await db.query("UPDATE visitas.huellas SET activo=FALSE WHERE id=$1", [req.params.id]);
        res.json({ mensaje: "Huella desactivada" });
    } catch (err) { res.status(500).json({ error: "Error eliminando huella" }); }
});

module.exports = router;
