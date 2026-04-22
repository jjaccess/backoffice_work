@echo off
:: ================================================================
:: Instalación del Agente MAC en Windows (requiere NSSM)
:: Descargar NSSM de: https://nssm.cc/download
:: Ejecutar como Administrador
:: ================================================================

SET RUTA=%~dp0
SET PYTHON=python
SET SERVICIO=AgentMAC

echo [1/3] Instalando dependencias Python...
%PYTHON% -m pip install websockets psutil

echo [2/3] Instalando servicio con NSSM...
nssm install %SERVICIO% "%PYTHON%" "%RUTA%agente_mac.py"
nssm set %SERVICIO% DisplayName "Agente MAC - Sistema Visitas"
nssm set %SERVICIO% Description "Expone la direccion MAC del equipo via WebSocket local"
nssm set %SERVICIO% Start SERVICE_AUTO_START
nssm set %SERVICIO% AppStdout "%RUTA%agente_mac.log"
nssm set %SERVICIO% AppStderr "%RUTA%agente_mac_err.log"

echo [3/3] Iniciando servicio...
nssm start %SERVICIO%

echo.
echo Servicio instalado correctamente.
echo Comandos utiles:
echo   nssm start %SERVICIO%
echo   nssm stop %SERVICIO%
echo   nssm restart %SERVICIO%
pause
