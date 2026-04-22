#!/usr/bin/env python3
"""
Agente MAC — Sistema de Visitas Biométrico
==========================================
Servicio ligero que expone la dirección MAC del equipo vía WebSocket local.
Puerto: 2021  →  ws://localhost:2021

Compatible: Windows 10/11 y Ubuntu 20.04+
Instalación de dependencias:
    pip install websockets psutil

Como servicio en Ubuntu:
    sudo cp agente_mac.service /etc/systemd/system/
    sudo systemctl enable agente_mac
    sudo systemctl start agente_mac

Como servicio en Windows (con NSSM):
    nssm install AgentMAC "python" "C:\\ruta\\agente_mac.py"
    nssm start AgentMAC
"""

import asyncio
import json
import logging
import platform
import socket
import sys
from datetime import datetime

# ── Dependencias opcionales ───────────────────────────────────────────────────
try:
    import websockets
except ImportError:
    print("ERROR: Instala websockets con:  pip install websockets")
    sys.exit(1)

try:
    import psutil
except ImportError:
    psutil = None
    print("AVISO: psutil no instalado (pip install psutil). "
          "Se usará método alternativo para obtener la MAC.")

# ── Configuración ─────────────────────────────────────────────────────────────
HOST    = "localhost"
PORT    = 2021
VERSION = "1.0.0"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [AgentMAC] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("agente_mac")


# ── Lógica de obtención de MAC ────────────────────────────────────────────────

def _mac_con_psutil() -> dict:
    """
    Obtiene la MAC de la interfaz principal usando psutil.
    Prioridad: Ethernet > WiFi > cualquier otra activa.
    """
    candidatos = []

    for nombre, addrs in psutil.net_if_addrs().items():
        # Buscar MAC en las direcciones de esta interfaz
        mac = None
        tiene_ip = False

        for addr in addrs:
            # AF_LINK = 17 (Linux) / AF_LINK = 18 (macOS) / psutil.AF_LINK
            if addr.family == psutil.AF_LINK:
                mac = addr.address.upper().replace("-", ":").replace(".", ":")
            # IPv4 real (no loopback)
            if hasattr(psutil, 'AF_INET') and addr.family == psutil.AF_INET:
                if not addr.address.startswith("127."):
                    tiene_ip = True

        if mac and mac not in ("00:00:00:00:00:00", ""):
            # Determinar prioridad por nombre de interfaz
            nombre_lower = nombre.lower()
            if any(x in nombre_lower for x in ["eth", "enp", "eno", "en0"]):
                prioridad = 0  # Ethernet — mayor prioridad
            elif any(x in nombre_lower for x in ["wlan", "wifi", "wi-fi", "wlp", "wl"]):
                prioridad = 1  # WiFi
            elif "loopback" in nombre_lower or nombre_lower == "lo":
                continue       # Ignorar loopback
            else:
                prioridad = 2  # Otras

            candidatos.append({
                "interfaz": nombre,
                "mac":      mac,
                "tiene_ip": tiene_ip,
                "prioridad": prioridad
            })

    if not candidatos:
        return {"error": "No se encontraron interfaces de red"}

    # Ordenar: primero las que tienen IP, luego por prioridad de interfaz
    candidatos.sort(key=lambda x: (not x["tiene_ip"], x["prioridad"]))
    mejor = candidatos[0]

    return {
        "mac":       mejor["mac"],
        "interfaz":  mejor["interfaz"],
        "todas":     [{"interfaz": c["interfaz"], "mac": c["mac"]} for c in candidatos]
    }


def _mac_sin_psutil() -> dict:
    """Fallback: obtiene MAC usando el módulo uuid estándar."""
    import uuid
    mac_int = uuid.getnode()
    mac_str = ":".join(
        f"{(mac_int >> (8 * i)) & 0xFF:02X}" for i in range(5, -1, -1)
    )
    return {"mac": mac_str, "interfaz": "desconocida", "todas": []}


def obtener_mac() -> dict:
    """Punto de entrada principal para obtener la MAC."""
    if psutil:
        return _mac_con_psutil()
    return _mac_sin_psutil()


def obtener_info_equipo() -> dict:
    """Reúne toda la información del equipo."""
    mac_info = obtener_mac()
    info = {
        "version":   VERSION,
        "hostname":  socket.gethostname(),
        "os":        platform.system(),
        "os_version": platform.version(),
        "timestamp": datetime.now().isoformat(),
        **mac_info
    }

    # IP local
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            info["ip"] = s.getsockname()[0]
    except Exception:
        info["ip"] = "desconocida"

    return info


# ── WebSocket handler ─────────────────────────────────────────────────────────

async def handler(websocket, path=None):
    """
    Maneja cada conexión WebSocket entrante.

    El cliente puede enviar:
        {"accion": "obtener_mac"}   → responde con info completa del equipo
        {"accion": "ping"}          → responde {"pong": true}

    Si no envía nada o envía un JSON inválido, devuelve la info por defecto.
    """
    cliente = websocket.remote_address
    log.info(f"Conexión desde {cliente}")

    try:
        async for mensaje in websocket:
            log.debug(f"Mensaje recibido: {mensaje!r}")

            # Intentar parsear JSON
            try:
                data = json.loads(mensaje)
                accion = data.get("accion", "obtener_mac")
            except (json.JSONDecodeError, AttributeError):
                accion = "obtener_mac"

            if accion == "ping":
                respuesta = {"pong": True, "timestamp": datetime.now().isoformat()}
            elif accion == "obtener_mac":
                respuesta = obtener_info_equipo()
            else:
                respuesta = {"error": f"Acción desconocida: {accion}"}

            await websocket.send(json.dumps(respuesta))
            log.info(f"Respondido a {cliente}: MAC={respuesta.get('mac', 'N/A')}")

    except websockets.exceptions.ConnectionClosedOK:
        log.debug(f"Conexión cerrada limpiamente desde {cliente}")
    except websockets.exceptions.ConnectionClosedError as e:
        log.warning(f"Conexión cerrada con error desde {cliente}: {e}")
    except Exception as e:
        log.error(f"Error inesperado con {cliente}: {e}")


# ── CORS — permite conexiones desde el browser ────────────────────────────────

async def process_request(path, request_headers):
    """Permite CORS para conexiones desde navegadores locales."""
    # websockets >= 10 usa esta firma
    return None  # continuar con el handshake normal


# ── Punto de entrada ──────────────────────────────────────────────────────────

async def main():
    log.info(f"Agente MAC v{VERSION} iniciando en ws://{HOST}:{PORT}")
    log.info(f"Sistema operativo: {platform.system()} {platform.version()}")

    # Verificar MAC antes de iniciar
    info = obtener_info_equipo()
    log.info(f"MAC detectada: {info.get('mac')} ({info.get('interfaz')}) — IP: {info.get('ip')}")

    # Soporte para diferentes versiones de websockets
    try:
        # websockets >= 10
        async with websockets.serve(
            handler,
            HOST,
            PORT,
            ping_interval=30,
            ping_timeout=10,
        ) as server:
            log.info(f"✅ Agente escuchando en ws://{HOST}:{PORT}")
            await asyncio.Future()  # Corre indefinidamente
    except Exception as e:
        log.error(f"Error iniciando servidor WebSocket: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Agente detenido por el usuario.")
    except OSError as e:
        if "Address already in use" in str(e) or "10048" in str(e):
            log.error(f"Puerto {PORT} ya está en uso. ¿Ya hay una instancia corriendo?")
        else:
            log.error(f"Error de red: {e}")
        sys.exit(1)
