"use strict";
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const db = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const personasRoutes = require("./routes/personas.routes");
const huellasRoutes = require("./routes/huellas.routes");
const visitasRoutes = require("./routes/visitas.routes");
const equiposRoutes = require("./routes/equipos.routes");
const geografiaRoutes = require("./routes/geografia.routes");

const app = express();

// ── 1. CORS ───────────────────────────────────────────────────
const envOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(o => o.trim())
    .filter(o => o !== "");

const whitelist = [
    "http://localhost:4200",
    ...envOrigins
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("No permitido por CORS: " + origin));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.options("*", cors());

// ── 2. MIDDLEWARES ────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── 3. RATE LIMIT ─────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas solicitudes." }
});
app.use("/api/", limiter);

// ── 4. HEALTH CHECK ───────────────────────────────────────────
app.get("/health", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ status: "ok", db: "connected", ts: new Date().toISOString() });
    } catch (err) {
        res.status(503).json({ status: "error", db: "disconnected" });
    }
});

// ── 5. RUTAS ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/personas", personasRoutes);
app.use("/api/huellas", huellasRoutes);
app.use("/api/visitas", visitasRoutes);
app.use("/api/equipos", equiposRoutes);
app.use("/api/geografia", geografiaRoutes);

// ── 6. ERROR HANDLERS ─────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
    console.error("[ERROR]", err.message);
    res.status(err.status || 500).json({
        error: err.status === 500 ? "Error interno" : err.message
    });
});

// ── 7. INICIAR SERVIDOR ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Servidor activo en puerto ${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV || "development"}`);
    console.log(`   CORS permitido para: ${whitelist.join(", ")}`);
});

module.exports = app;
