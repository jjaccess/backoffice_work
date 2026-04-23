"use strict";
const express = require("express");
const db = require("../config/db");
const { autenticar, autorizar } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(autenticar);

// ── GET /api/personas/enroladas ──────────────────────────────
// Devuelve todas las personas que tienen al menos 1 huella activa
router.get("/enroladas", async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT p.id, p.documento, p.tipo_documento,
                    p.nombres, p.apellidos,
                    p.nombres || ' ' || p.apellidos AS nombre_completo,
                    p.email, p.telefono, p.departamento, p.cargo,
                    p.activo, p.created_at,
                    COUNT(h.id)::int AS total_huellas
             FROM visitas.personas p
             INNER JOIN visitas.huellas h ON h.persona_id = p.id AND h.activo = TRUE
             GROUP BY p.id
             ORDER BY p.apellidos, p.nombres`
        );
        res.json(rows);
    } catch (err) {
        console.error("[personas/enroladas]", err);
        res.status(500).json({ error: "Error consultando personas enroladas" });
    }
});

// ── GET /api/personas?q=&page=&limit= ────────────────────────
router.get("/", async (req, res) => {
    try {
        const { q = "", page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows } = await db.query(
            `SELECT p.id, p.documento, p.tipo_documento,
                    p.nombres || ' ' || p.apellidos AS nombre_completo,
                    p.nombres, p.apellidos, p.email, p.telefono,
                    p.empresa, p.cargo, p.activo, p.created_at,
                    COUNT(h.id) AS total_huellas
             FROM visitas.personas p
             LEFT JOIN visitas.huellas h ON h.persona_id = p.id AND h.activo = TRUE
             WHERE ($1 = '' OR p.documento ILIKE '%' || $1 || '%'
                           OR p.nombres   ILIKE '%' || $1 || '%'
                           OR p.apellidos ILIKE '%' || $1 || '%')
             GROUP BY p.id
             ORDER BY p.apellidos, p.nombres
             LIMIT $2 OFFSET $3`,
            [q, parseInt(limit), offset]
        );

        const { rows: total } = await db.query(
            `SELECT COUNT(*) FROM visitas.personas
             WHERE ($1 = '' OR documento ILIKE '%' || $1 || '%'
                           OR nombres   ILIKE '%' || $1 || '%'
                           OR apellidos ILIKE '%' || $1 || '%')`,
            [q]
        );

        res.json({ data: rows, total: parseInt(total[0].count), page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("[personas/GET]", err);
        res.status(500).json({ error: "Error consultando personas" });
    }
});

// ── GET /api/personas/documento/:doc ─────────────────────────
router.get("/documento/:doc", async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT p.*, COUNT(h.id) AS total_huellas
             FROM visitas.personas p
             LEFT JOIN visitas.huellas h ON h.persona_id = p.id AND h.activo = TRUE
             WHERE p.documento = $1
             GROUP BY p.id`,
            [req.params.doc]
        );
        if (!rows.length) return res.status(404).json({ error: "Persona no encontrada" });
        res.json(rows[0]);
    } catch (err) {
        console.error("[personas/documento]", err);
        res.status(500).json({ error: "Error consultando persona" });
    }
});

// ── POST /api/personas ───────────────────────────────────────
router.post("/", autorizar("ADMIN", "OPERADOR"), async (req, res) => {
    try {
        const { documento, tipo_documento = "CC", nombres, apellidos,
            email, telefono, empresa, cargo, foto_base64 } = req.body;

        if (!documento || !nombres || !apellidos)
            return res.status(400).json({ error: "documento, nombres y apellidos son requeridos" });

        const { rows } = await db.query(
            `INSERT INTO visitas.personas
                (documento, tipo_documento, nombres, apellidos, email, telefono, empresa, cargo, foto_base64)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [documento, tipo_documento, nombres, apellidos, email, telefono, empresa, cargo, foto_base64]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === "23505")
            return res.status(409).json({ error: "Ya existe una persona con ese documento" });
        console.error("[personas/POST]", err);
        res.status(500).json({ error: "Error creando persona" });
    }
});

// ── PUT /api/personas/:id ────────────────────────────────────
router.put("/:id", autorizar("ADMIN", "OPERADOR"), async (req, res) => {
    try {
        const { nombres, apellidos, email, telefono, empresa, cargo, activo, foto_base64 } = req.body;
        const { rows } = await db.query(
            `UPDATE visitas.personas
             SET nombres=$1, apellidos=$2, email=$3, telefono=$4,
                 empresa=$5, cargo=$6, activo=$7, foto_base64=$8
             WHERE id=$9 RETURNING *`,
            [nombres, apellidos, email, telefono, empresa, cargo, activo, foto_base64, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: "Persona no encontrada" });
        res.json(rows[0]);
    } catch (err) {
        console.error("[personas/PUT]", err);
        res.status(500).json({ error: "Error actualizando persona" });
    }
});

module.exports = router;