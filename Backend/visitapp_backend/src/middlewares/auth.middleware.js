"use strict";
const jwt = require("jsonwebtoken");

/**
 * Middleware: verifica el token JWT en el header Authorization.
 */
function autenticar(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token requerido" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}

/**
 * Middleware: verifica que el usuario tenga el rol requerido.
 * @param {...string} roles  Roles permitidos, ej: "ADMIN", "OPERADOR"
 */
function autorizar(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.usuario?.rol)) {
            return res.status(403).json({ error: "Sin permisos para esta acción" });
        }
        next();
    };
}

module.exports = { autenticar, autorizar };
