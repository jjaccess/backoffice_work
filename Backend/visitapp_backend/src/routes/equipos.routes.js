"use strict";
const express = require("express");
const db      = require("../config/db");
const { autenticar, autorizar } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(autenticar);

// GET /api/equipos
router.get("/", async (_req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT * FROM visitas.equipos ORDER BY descripcion"
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Error consultando equipos" });
    }
});

// POST /api/equipos
router.post("/", autorizar("ADMIN"), async (req, res) => {
    try {
        const { mac_address, hostname, descripcion, sede } = req.body;
        if (!mac_address)
            return res.status(400).json({ error: "mac_address requerida" });

        const { rows } = await db.query(
            `INSERT INTO visitas.equipos (mac_address, hostname, descripcion, sede)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [mac_address.toUpperCase(), hostname, descripcion, sede]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === "23505")
            return res.status(409).json({ error: "MAC ya registrada" });
        res.status(500).json({ error: "Error creando equipo" });
    }
});

// PUT /api/equipos/:id
router.put("/:id", autorizar("ADMIN"), async (req, res) => {
    try {
        const { hostname, descripcion, sede, activo } = req.body;
        const { rows } = await db.query(
            `UPDATE visitas.equipos SET hostname=$1, descripcion=$2, sede=$3, activo=$4
             WHERE id=$5 RETURNING *`,
            [hostname, descripcion, sede, activo, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: "Equipo no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error actualizando equipo" });
    }
});

module.exports = router;
