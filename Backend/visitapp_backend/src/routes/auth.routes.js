"use strict";
const express = require("express");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const db      = require("../config/db");
const { autenticar } = require("../middlewares/auth.middleware");

const router = express.Router();

// ── POST /api/auth/login ─────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "Usuario y contraseña requeridos" });

        const { rows } = await db.query(
            `SELECT id, username, password_hash, nombres, apellidos, rol, activo
             FROM visitas.usuarios_sistema
             WHERE username = $1`,
            [username]
        );

        if (!rows.length || !rows[0].activo)
            return res.status(401).json({ error: "Credenciales inválidas" });

        const usuario = rows[0];
        const match   = await bcrypt.compare(password, usuario.password_hash);
        if (!match)
            return res.status(401).json({ error: "Credenciales inválidas" });

        // Actualizar último acceso
        await db.query(
            `UPDATE visitas.usuarios_sistema SET ultimo_acceso = NOW() WHERE id = $1`,
            [usuario.id]
        );

        const token = jwt.sign(
            { id: usuario.id, username: usuario.username,
              nombre: `${usuario.nombres} ${usuario.apellidos}`,
              rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
        );

        res.json({
            token,
            usuario: {
                id:       usuario.id,
                username: usuario.username,
                nombre:   `${usuario.nombres} ${usuario.apellidos}`,
                rol:      usuario.rol
            }
        });
    } catch (err) {
        console.error("[auth/login]", err);
        res.status(500).json({ error: "Error interno" });
    }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get("/me", autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
});

module.exports = router;
