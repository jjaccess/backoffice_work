"use strict";
const { Pool } = require("pg");

const pool = new Pool({
    host:     process.env.DB_HOST     || "localhost",
    port:     parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME     || "visitas_db",
    user:     process.env.DB_USER     || "visitas_app",
    password: process.env.DB_PASSWORD,
    max:      parseInt(process.env.DB_MAX_CONNECTIONS || "10"),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000"),
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

pool.on("error", (err) => {
    console.error("[DB] Error inesperado en cliente del pool:", err.message);
});

// Verificar conexión al inicio
pool.connect()
    .then(client => {
        console.log("✅ Conectado a PostgreSQL");
        client.release();
    })
    .catch(err => {
        console.error("❌ Error conectando a PostgreSQL:", err.message);
        process.exit(1);
    });

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
