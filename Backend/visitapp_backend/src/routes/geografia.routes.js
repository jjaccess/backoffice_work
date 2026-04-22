"use strict";
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const db = require("../config/db");
const { autenticar, autorizar } = require("../middlewares/auth.middleware");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS (sin token) — selectores en cascada
// ════════════════════════════════════════════════════════════

router.get("/departamentos", async (_req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, nombre FROM visitas.departamentos WHERE activo=TRUE ORDER BY nombre"
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Error cargando departamentos" }); }
});

router.get("/zonas", async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, nombre FROM visitas.zonas WHERE departamento_id=$1 AND activo=TRUE ORDER BY nombre",
            [req.query.departamento_id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Error cargando zonas" }); }
});

router.get("/subzonas", async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, nombre FROM visitas.subzonas WHERE zona_id=$1 AND activo=TRUE ORDER BY nombre",
            [req.query.zona_id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Error cargando subzonas" }); }
});

router.get("/celulas", async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, nombre FROM visitas.celulas WHERE subzona_id=$1 AND activo=TRUE ORDER BY nombre",
            [req.query.subzona_id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Error cargando cédulas" }); }
});

router.get("/oficinas", async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, nombre FROM visitas.oficinas WHERE celula_id=$1 AND activo=TRUE ORDER BY nombre",
            [req.query.celula_id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Error cargando oficinas" }); }
});

router.get("/jerarquia-completa", async (_req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                pdv_id AS codigo_pdv, departamento, zona, subzona, celula, oficina, 
                punto_venta as nombre_pdv, mac_address as mac 
            FROM visitas.v_puntosdeventa 
            ORDER BY departamento, zona, punto_venta
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error en jerarquía:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ── PDV por MAC — público porque lo usa el quiosco sin login ─
router.get("/puntosdeventa/mac/:mac", async (req, res) => {
    try {
        const mac = req.params.mac.toUpperCase().replace(/-/g, ":");
        const { rows } = await db.query(
            "SELECT * FROM visitas.v_puntosdeventa WHERE mac_address = $1",
            [mac]
        );
        if (!rows.length) return res.status(404).json({ error: "PDV no registrado para esta MAC" });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: "Error buscando PDV" }); }
});

// ── Descargar plantilla Excel (Ruta Pública) ────────────────
const path = require("path");
const fs = require("fs");

router.get("/plantilla", (req, res) => {
    // Construimos la ruta hacia src/assets/plantilla_pdv.xlsx
    const rutaArchivo = path.join(__dirname, "..", "assets", "plantilla_pdv.xlsx");

    if (fs.existsSync(rutaArchivo)) {
        res.download(rutaArchivo, "plantilla_pdv.xlsx");
    } else {
        res.status(404).json({ error: "Archivo de plantilla no encontrado en el servidor" });
    }
});

// ════════════════════════════════════════════════════════════
// RUTAS PROTEGIDAS — requieren token JWT
// ════════════════════════════════════════════════════════════
router.use(autenticar);

// ── Lista completa de PDV con jerarquía ──────────────────────
router.get("/puntosdeventa", async (_req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM visitas.v_puntosdeventa");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Error cargando PDV" }); }
});

// ── Crear PDV individual ─────────────────────────────────────
router.post("/puntosdeventa", autorizar("ADMIN"), async (req, res) => {
    try {
        const { oficina_id, nombre, mac_address, direccion } = req.body;
        if (!oficina_id || !nombre || !mac_address)
            return res.status(400).json({ error: "oficina_id, nombre y mac_address son requeridos" });

        const { rows } = await db.query(
            `INSERT INTO visitas.puntosdeventa (oficina_id, nombre, mac_address, direccion)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [oficina_id, nombre, mac_address.toUpperCase().replace(/-/g, ":"), direccion || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === "23505") return res.status(409).json({ error: "MAC ya registrada en otro PDV" });
        res.status(500).json({ error: "Error creando PDV" });
    }
});

// ── CRUD jerarquía ───────────────────────────────────────────
router.post("/departamentos", autorizar("ADMIN"), async (req, res) => {
    try {
        const { rows } = await db.query(
            "INSERT INTO visitas.departamentos (nombre) VALUES ($1) RETURNING *",
            [req.body.nombre]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === "23505") return res.status(409).json({ error: "Departamento ya existe" });
        res.status(500).json({ error: "Error" });
    }
});

router.post("/zonas", autorizar("ADMIN"), async (req, res) => {
    try {
        const { rows } = await db.query(
            "INSERT INTO visitas.zonas (departamento_id, nombre) VALUES ($1,$2) RETURNING *",
            [req.body.departamento_id, req.body.nombre]
        );
        res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

router.post("/subzonas", autorizar("ADMIN"), async (req, res) => {
    try {
        const { rows } = await db.query(
            "INSERT INTO visitas.subzonas (zona_id, nombre) VALUES ($1,$2) RETURNING *",
            [req.body.zona_id, req.body.nombre]
        );
        res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

router.post("/celulas", autorizar("ADMIN"), async (req, res) => {
    try {
        const { rows } = await db.query(
            "INSERT INTO visitas.celulas (subzona_id, nombre) VALUES ($1,$2) RETURNING *",
            [req.body.subzona_id, req.body.nombre]
        );
        res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

router.post("/oficinas", autorizar("ADMIN"), async (req, res) => {
    try {
        const { rows } = await db.query(
            "INSERT INTO visitas.oficinas (celula_id, nombre) VALUES ($1,$2) RETURNING *",
            [req.body.celula_id, req.body.nombre]
        );
        res.status(201).json(rows[0]);
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

// ════════════════════════════════════════════════════════════
// CARGA MASIVA DESDE EXCEL
// ════════════════════════════════════════════════════════════
router.post(
    "/cargar-excel",
    autorizar("ADMIN"),
    upload.single("archivo"),
    async (req, res) => {
        if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

        // ── Leer el Excel ─────────────────────────────────────
        let filas;
        try {
            const wb = XLSX.read(req.file.buffer, { type: "buffer" });
            const ws = wb.Sheets["PDV"];
            if (!ws) return res.status(400).json({ error: 'El Excel no tiene la hoja "PDV"' });
            // range:3 salta título(1) + instrucción(2) + cabecera(3), empieza en fila 4
            filas = XLSX.utils.sheet_to_json(ws, { range: 2, defval: "" });
        } catch (e) {
            return res.status(400).json({ error: "Error leyendo Excel: " + e.message });
        }

        const resultados = { insertados: 0, actualizados: 0, errores: [] };
        const client = await db.pool.connect();

        try {
            await client.query("BEGIN");

            for (let i = 0; i < filas.length; i++) {
                const f = filas[i];
                const fila = i + 4; // número real de fila en Excel

                // ── Extraer campos (compatibles con cabeceras de la plantilla) ──
                const departamento = String(f["DEPARTAMENTO *"] || f["DEPARTAMENTO"] || "").trim();
                const zona = String(f["ZONA *"] || f["ZONA"] || "").trim();
                const subzona = String(f["SUBZONA *"] || f["SUBZONA"] || "").trim();
                const celula = String(f["CÉLULA *"] || f["CELULA *"] ||
                    f["CÉLULA"] || f["CELULA"] || "").trim();
                const oficina = String(f["OFICINA *"] || f["OFICINA"] || "").trim();
                const pdv_nombre = String(f["PUNTO DE VENTA *"] || f["PUNTO DE VENTA"] || "").trim();
                const mac_raw = String(f["MAC ADDRESS *"] || f["MAC ADDRESS"] || "").trim();
                const mac = mac_raw.toUpperCase().replace(/-/g, ":");
                const direccion = String(f["DIRECCIÓN"] || f["DIRECCION"] || "").trim();

                // Saltar filas completamente vacías
                if (!departamento && !zona && !mac_raw) continue;

                // ── Validaciones ──────────────────────────────
                if (!departamento || !zona || !subzona || !celula || !oficina || !pdv_nombre || !mac) {
                    resultados.errores.push({
                        fila,
                        error: "Faltan campos obligatorios",
                        datos: { departamento, zona, subzona, celula, oficina, pdv_nombre, mac }
                    });
                    continue;
                }

                const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
                if (!macRegex.test(mac)) {
                    resultados.errores.push({
                        fila,
                        error: `MAC inválida: "${mac}". Use formato XX:XX:XX:XX:XX:XX`
                    });
                    continue;
                }

                // ── Upsert en cascada ─────────────────────────
                try {
                    const { rows: rDep } = await client.query(
                        `INSERT INTO visitas.departamentos (nombre) VALUES ($1)
                         ON CONFLICT (nombre) DO UPDATE SET nombre=EXCLUDED.nombre
                         RETURNING id`,
                        [departamento]
                    );
                    const { rows: rZona } = await client.query(
                        `INSERT INTO visitas.zonas (departamento_id, nombre) VALUES ($1,$2)
                         ON CONFLICT (departamento_id, nombre) DO UPDATE SET nombre=EXCLUDED.nombre
                         RETURNING id`,
                        [rDep[0].id, zona]
                    );
                    const { rows: rSub } = await client.query(
                        `INSERT INTO visitas.subzonas (zona_id, nombre) VALUES ($1,$2)
                         ON CONFLICT (zona_id, nombre) DO UPDATE SET nombre=EXCLUDED.nombre
                         RETURNING id`,
                        [rZona[0].id, subzona]
                    );
                    const { rows: rCel } = await client.query(
                        `INSERT INTO visitas.celulas (subzona_id, nombre) VALUES ($1,$2)
                         ON CONFLICT (subzona_id, nombre) DO UPDATE SET nombre=EXCLUDED.nombre
                         RETURNING id`,
                        [rSub[0].id, celula]
                    );
                    const { rows: rOfi } = await client.query(
                        `INSERT INTO visitas.oficinas (celula_id, nombre) VALUES ($1,$2)
                         ON CONFLICT (celula_id, nombre) DO UPDATE SET nombre=EXCLUDED.nombre
                         RETURNING id`,
                        [rCel[0].id, oficina]
                    );

                    const existe = await client.query(
                        "SELECT id FROM visitas.puntosdeventa WHERE mac_address=$1", [mac]
                    );

                    if (existe.rows.length > 0) {
                        await client.query(
                            `UPDATE visitas.puntosdeventa
                             SET oficina_id=$1, nombre=$2, direccion=$3, activo=TRUE
                             WHERE mac_address=$4`,
                            [rOfi[0].id, pdv_nombre, direccion || null, mac]
                        );
                        resultados.actualizados++;
                    } else {
                        await client.query(
                            `INSERT INTO visitas.puntosdeventa
                             (oficina_id, nombre, mac_address, direccion)
                             VALUES ($1,$2,$3,$4)`,
                            [rOfi[0].id, pdv_nombre, mac, direccion || null]
                        );
                        resultados.insertados++;
                    }

                } catch (rowErr) {
                    resultados.errores.push({ fila, error: rowErr.message });
                }
            }

            await client.query("COMMIT");

        } catch (err) {
            await client.query("ROLLBACK");
            return res.status(500).json({ error: "Error en transacción: " + err.message });
        } finally {
            client.release();
        }

        res.json({
            mensaje: `Carga completada. ${resultados.insertados} insertados, ${resultados.actualizados} actualizados.`,
            insertados: resultados.insertados,
            actualizados: resultados.actualizados,
            errores: resultados.errores,
            total_filas: filas.length
        });
    }
);

module.exports = router;