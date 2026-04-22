"use strict";
// Agregar al inicio de geografia.routes.js
// Dependencia: npm install multer xlsx
const express = require("express");
const multer  = require("multer");
const XLSX    = require("xlsx");
const db      = require("../config/db");
const { autenticar, autorizar } = require("../middlewares/auth.middleware");

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── POST /api/geografia/cargar-excel ─────────────────────────
// Body: multipart/form-data  campo: archivo (xlsx)
router.post(
  "/cargar-excel",
  autenticar,
  autorizar("ADMIN"),
  upload.single("archivo"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

    let filas;
    try {
      const wb   = XLSX.read(req.file.buffer, { type: "buffer" });
      const ws   = wb.Sheets["PDV"];
      if (!ws) return res.status(400).json({ error: 'El Excel no tiene la hoja "PDV"' });
      // Leer desde fila 4 (fila 1=título, 2=instrucción, 3=cabeceras)
      filas = XLSX.utils.sheet_to_json(ws, { range: 3, defval: "" });
    } catch (e) {
      return res.status(400).json({ error: "Error leyendo el archivo Excel: " + e.message });
    }

    const resultados = { insertados: 0, actualizados: 0, errores: [] };
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      for (let i = 0; i < filas.length; i++) {
        const f   = filas[i];
        const fila = i + 4; // número de fila real en Excel

        // Mapear columnas (compatibles con cabeceras de la plantilla)
        const departamento = String(f["DEPARTAMENTO *"] || f["DEPARTAMENTO"] || "").trim();
        const zona         = String(f["ZONA *"]         || f["ZONA"]         || "").trim();
        const subzona      = String(f["SUBZONA *"]      || f["SUBZONA"]      || "").trim();
        const celula       = String(f["CÉLULA *"]       || f["CELULA *"]     || f["CÉLULA"] || "").trim();
        const oficina      = String(f["OFICINA *"]      || f["OFICINA"]      || "").trim();
        const pdv_nombre   = String(f["PUNTO DE VENTA *"]|| f["PUNTO DE VENTA"]|| "").trim();
        const mac          = String(f["MAC ADDRESS *"]  || f["MAC ADDRESS"]  || "").trim().toUpperCase();
        const direccion    = String(f["DIRECCIÓN"]      || f["DIRECCION"]    || "").trim();

        // Validaciones
        if (!departamento || !zona || !subzona || !celula || !oficina || !pdv_nombre || !mac) {
          resultados.errores.push({ fila, error: "Faltan campos obligatorios", datos: { departamento, zona, pdv_nombre, mac } });
          continue;
        }

        const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
        if (!macRegex.test(mac)) {
          resultados.errores.push({ fila, error: `MAC inválida: "${mac}". Formato esperado: XX:XX:XX:XX:XX:XX` });
          continue;
        }

        try {
          // UPSERT en cascada por cada nivel de la jerarquía
          // 1. Departamento
          const { rows: rDep } = await client.query(
            `INSERT INTO visitas.departamentos (nombre)
             VALUES ($1)
             ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
             RETURNING id`,
            [departamento]
          );
          const dep_id = rDep[0].id;

          // 2. Zona
          const { rows: rZona } = await client.query(
            `INSERT INTO visitas.zonas (departamento_id, nombre)
             VALUES ($1, $2)
             ON CONFLICT (departamento_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
             RETURNING id`,
            [dep_id, zona]
          );
          const zona_id = rZona[0].id;

          // 3. Subzona
          const { rows: rSub } = await client.query(
            `INSERT INTO visitas.subzonas (zona_id, nombre)
             VALUES ($1, $2)
             ON CONFLICT (zona_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
             RETURNING id`,
            [zona_id, subzona]
          );
          const sub_id = rSub[0].id;

          // 4. Célula
          const { rows: rCel } = await client.query(
            `INSERT INTO visitas.celulas (subzona_id, nombre)
             VALUES ($1, $2)
             ON CONFLICT (subzona_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
             RETURNING id`,
            [sub_id, celula]
          );
          const cel_id = rCel[0].id;

          // 5. Oficina
          const { rows: rOfi } = await client.query(
            `INSERT INTO visitas.oficinas (celula_id, nombre)
             VALUES ($1, $2)
             ON CONFLICT (celula_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
             RETURNING id`,
            [cel_id, oficina]
          );
          const ofi_id = rOfi[0].id;

          // 6. Punto de venta (upsert por MAC)
          const existente = await client.query(
            "SELECT id FROM visitas.puntosdeventa WHERE mac_address = $1",
            [mac]
          );

          if (existente.rows.length > 0) {
            await client.query(
              `UPDATE visitas.puntosdeventa
               SET oficina_id=$1, nombre=$2, direccion=$3, activo=TRUE
               WHERE mac_address=$4`,
              [ofi_id, pdv_nombre, direccion || null, mac]
            );
            resultados.actualizados++;
          } else {
            await client.query(
              `INSERT INTO visitas.puntosdeventa (oficina_id, nombre, mac_address, direccion)
               VALUES ($1, $2, $3, $4)`,
              [ofi_id, pdv_nombre, mac, direccion || null]
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
      return res.status(500).json({ error: "Error en la transacción: " + err.message });
    } finally {
      client.release();
    }

    res.json({
      mensaje:     `Carga completada. ${resultados.insertados} insertados, ${resultados.actualizados} actualizados.`,
      insertados:  resultados.insertados,
      actualizados: resultados.actualizados,
      errores:     resultados.errores,
      total_filas: filas.length
    });
  }
);

// ── GET /api/geografia/plantilla — descarga la plantilla ─────
router.get("/plantilla", autenticar, (_req, res) => {
  const path = require("path");
  const file = path.join(__dirname, "../../assets/plantilla_pdv.xlsx");
  res.download(file, "plantilla_pdv.xlsx");
});

module.exports = router;
