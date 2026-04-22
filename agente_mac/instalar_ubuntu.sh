#!/bin/bash
# ================================================================
# Instalación del Agente MAC en Ubuntu 20.04+
# Ejecutar como: sudo bash instalar_agente.sh
# ================================================================

set -e

RUTA_DESTINO="/home/operaciones/businessnet"
USUARIO="operaciones"

echo "📦 Instalando dependencias Python..."
pip3 install websockets psutil --break-system-packages 2>/dev/null || \
pip3 install websockets psutil

echo "📁 Copiando archivos..."
mkdir -p "$RUTA_DESTINO"
cp agente_mac.py "$RUTA_DESTINO/"
chown "$USUARIO:$USUARIO" "$RUTA_DESTINO/agente_mac.py"
chmod 755 "$RUTA_DESTINO/agente_mac.py"

echo "⚙️  Instalando servicio systemd..."
cp agente_mac.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable agente_mac
systemctl start agente_mac

echo "✅ Servicio instalado. Verificando estado:"
systemctl status agente_mac --no-pager

echo ""
echo "Comandos útiles:"
echo "  sudo systemctl start agente_mac    → Iniciar"
echo "  sudo systemctl stop agente_mac     → Detener"
echo "  sudo systemctl restart agente_mac  → Reiniciar"
echo "  sudo journalctl -u agente_mac -f   → Ver logs en vivo"
