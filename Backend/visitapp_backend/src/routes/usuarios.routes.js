"use strict";
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { autenticar, autorizar } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(autenticar);

// Roles válidos del sistema
const ROLES_VALIDOS = ["ADMIN", "TIC", "TES", "FIN", "JUR", "CUM", "GH", "COM", "ADMTVO", "AUD"];

// ── GET /api/usuarios ─────────────────────────────────────────
router.get("/", autorizar("ADMIN", "TIC"), async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, username, nombres, apellidos, email, rol, activo,
                    ultimo_acceso, created_at
             FROM visitas.usuarios_sistema
             ORDER BY activo DESC, apellidos, nombres`
        );
        res.json(rows);
    } catch (err) {
        console.error("[usuarios/GET]", err);
        res.status(500).json({ error: "Error consultando usuarios" });
    }
});

// ── POST /api/usuarios ────────────────────────────────────────
router.post("/", autorizar("ADMIN", "TIC"), async (req, res) => {
    try {
        const { username, password, nombres, apellidos, email, rol = "TIC" } = req.body;

        if (!username || !password || !nombres || !apellidos)
            return res.status(400).json({ error: "username, password, nombres y apellidos son requeridos" });

        if (!ROLES_VALIDOS.includes(rol))
            return res.status(400).json({ error: `Rol inválido. Use: ${ROLES_VALIDOS.join(", ")}` });

        if (password.length < 6)
            return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });

        const password_hash = await bcrypt.hash(password, 12);

        const { rows } = await db.query(
            `INSERT INTO visitas.usuarios_sistema
                (username, password_hash, nombres, apellidos, email, rol)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING id, username, nombres, apellidos, email, rol, activo, created_at`,
            [username.toLowerCase().trim(), password_hash, nombres, apellidos, email || null, rol]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === "23505")
            return res.status(409).json({ error: "El nombre de usuario ya existe" });
        console.error("[usuarios/POST]", err);
        res.status(500).json({ error: "Error creando usuario" });
    }
});

// ── PUT /api/usuarios/:id ─────────────────────────────────────
router.put("/:id", autorizar("ADMIN", "TIC"), async (req, res) => {
    try {
        const { nombres, apellidos, email, rol, activo } = req.body;

        if (rol && !ROLES_VALIDOS.includes(rol))
            return res.status(400).json({ error: `Rol inválido. Use: ${ROLES_VALIDOS.join(", ")}` });

        const { rows } = await db.query(
            `UPDATE visitas.usuarios_sistema
             SET nombres=$1, apellidos=$2, email=$3, rol=$4, activo=$5
             WHERE id=$6
             RETURNING id, username, nombres, apellidos, email, rol, activo, created_at`,
            [nombres, apellidos, email || null, rol, activo, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        console.error("[usuarios/PUT]", err);
        res.status(500).json({ error: "Error actualizando usuario" });
    }
});

// ── PATCH /api/usuarios/:id/password ─────────────────────────
router.patch("/:id/password", autorizar("ADMIN", "TIC"), async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6)
            return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });

        const password_hash = await bcrypt.hash(password, 12);
        const { rows } = await db.query(
            `UPDATE visitas.usuarios_sistema
             SET password_hash=$1 WHERE id=$2
             RETURNING id, username`,
            [password_hash, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json({ mensaje: "Contraseña actualizada correctamente", usuario: rows[0].username });
    } catch (err) {
        console.error("[usuarios/password]", err);
        res.status(500).json({ error: "Error actualizando contraseña" });
    }
});

// ── PATCH /api/usuarios/:id/toggle ───────────────────────────
router.patch("/:id/toggle", autorizar("ADMIN", "TIC"), async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.usuario.id)
            return res.status(400).json({ error: "No puede desactivar su propia cuenta" });

        const { rows } = await db.query(
            `UPDATE visitas.usuarios_sistema
             SET activo = NOT activo WHERE id=$1
             RETURNING id, username, activo`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        console.error("[usuarios/toggle]", err);
        res.status(500).json({ error: "Error cambiando estado del usuario" });
    }
});

module.exports = router;